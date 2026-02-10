import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import * as db from '@/lib/db';
import { getNextKey, DailyLimitError } from '@/lib/keys';
import { validateMessage, unauthorized, badRequest, tooManyRequests, parseBody } from '@/lib/security';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'tngtech/deepseek-r1t2-chimera:free';

const SYSTEM_PROMPT = `You are Rocode, an AI coding assistant specialized in Roblox development with Luau.
You help users write scripts, debug code, and learn Roblox game development.
Be concise, helpful, and provide working code examples when relevant.
Use Luau syntax (not Lua 5.x). Format code blocks with \`\`\`lua.`;

interface ChatBody {
    chatId: string;
    message: string;
}

export async function POST(request: NextRequest) {
    // 1. Auth check
    const username = await verifySession(request);
    if (!username) return unauthorized();

    // 2. Rate limit
    const rateCheck = await db.checkRateLimit(username);
    if (!rateCheck.allowed) return tooManyRequests(rateCheck.remaining);

    // 3. Parse and validate body
    const body = await parseBody<ChatBody>(request);
    if (!body || !body.chatId || !body.message) {
        return badRequest('Missing chatId or message.');
    }

    const msgCheck = validateMessage(body.message);
    if (!msgCheck.ok) return badRequest(msgCheck.msg!);

    // 4. Verify chat ownership
    let chat = await db.getChat(body.chatId);
    if (!chat) {
        // Auto-create if doesn't exist
        chat = await db.createChat(username);
        body.chatId = chat.id;
    }
    if (chat.user !== username) return unauthorized();

    // 5. Save user message
    await db.addMessageToChat(body.chatId, 'user', body.message.trim());

    // 6. Get API key via smart rotation
    let apiKey: string;
    try {
        apiKey = await getNextKey();
    } catch (err) {
        if (err instanceof DailyLimitError) {
            return NextResponse.json(
                { error: 'Daily request limit reached. Please try again tomorrow.' },
                { status: 429 },
            );
        }
        throw err;
    }

    // 7. Build messages array for OpenRouter
    const updatedChat = await db.getChat(body.chatId);
    const messages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...(updatedChat?.messages || []).map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        })),
    ];

    // 8. Call OpenRouter with streaming
    const orResponse = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://rocode.vercel.app',
            'X-Title': 'Rocode',
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            stream: true,
            max_tokens: 2048,
            temperature: 0.7,
        }),
    });

    if (!orResponse.ok) {
        const errorText = await orResponse.text().catch(() => 'Unknown error');
        console.error('OpenRouter error:', orResponse.status, errorText);
        return NextResponse.json(
            { error: 'AI service temporarily unavailable. Please try again.' },
            { status: 502 },
        );
    }

    // 9. Stream the response back to the client
    const chatId = body.chatId;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
        async start(controller) {
            let fullContent = '';
            const reader = orResponse.body!.getReader();

            try {
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;
                        const data = trimmed.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) {
                                fullContent += delta;
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
                            }
                        } catch {
                            // Skip malformed JSON chunks
                        }
                    }
                }
            } catch (err) {
                console.error('Stream error:', err);
            } finally {
                // 10. Save full AI response to KV
                if (fullContent.trim()) {
                    await db.addMessageToChat(chatId, 'assistant', fullContent);
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Chat-Id': chatId,
        },
    });
}
