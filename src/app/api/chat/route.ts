import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import * as db from '@/lib/db';
import { validateMessage, unauthorized, badRequest, tooManyRequests, parseBody } from '@/lib/security';
import { canUseModel, getDailyLimit, PLANS } from '@/lib/plans';
import { callModel, buildMessages, parseGeminiDelta, parseOpenAIDelta } from '@/lib/models';
import type { ModelId } from '@/lib/plans';

interface ChatBody {
    chatId: string;
    message: string;
    model?: ModelId;
}

export async function POST(request: NextRequest) {
    // 1. Auth check
    const username = await verifySession(request);
    if (!username) return unauthorized();

    // 2. Rate limit (15 req/min, matches Gemini limits)
    const rateCheck = await db.checkRateLimit(username);
    if (!rateCheck.allowed) return tooManyRequests(rateCheck.remaining);

    // 3. Parse and validate body
    const body = await parseBody<ChatBody>(request);
    if (!body || !body.chatId || !body.message) {
        return badRequest('Missing chatId or message.');
    }

    const model: ModelId = body.model === 'max' ? 'max' : 'basic';

    // 4. Get user plan and enforce limits
    const plan = await db.getUserPlan(username);
    const planConfig = PLANS[plan];

    // Check model access
    if (!canUseModel(plan, model)) {
        return NextResponse.json(
            { error: 'Upgrade to Pro or Dev to use the Max model.' },
            { status: 403 },
        );
    }

    // Check message length against plan
    const msgCheck = validateMessage(body.message, planConfig.maxMsgLen);
    if (!msgCheck.ok) return badRequest(msgCheck.msg!);

    // Check daily usage limit
    const dailyLimit = getDailyLimit(plan, model);
    if (dailyLimit !== -1) {
        const used = await db.getUserModelUsage(username, model);
        if (used >= dailyLimit) {
            const limitMsg = model === 'max'
                ? `You've used all ${dailyLimit} Max model messages today. Upgrade for more.`
                : `You've used all ${dailyLimit} Basic messages today. Upgrade for unlimited.`;
            return NextResponse.json({ error: limitMsg }, { status: 429 });
        }
    }

    // 5. Verify chat ownership
    let chat = await db.getChat(body.chatId);
    if (!chat) {
        chat = await db.createChat(username);
        body.chatId = chat.id;
    }
    if (chat.user !== username) return unauthorized();

    // 6. Save user message
    await db.addMessageToChat(body.chatId, 'user', body.message.trim());

    // 7. Build messages array
    const updatedChat = await db.getChat(body.chatId);
    const messages = buildMessages(
        (updatedChat?.messages || []).map((m) => ({
            role: m.role,
            content: m.content,
        })),
    );

    // 8. Call the appropriate AI model
    let aiResponse: Response;
    try {
        aiResponse = await callModel(model, messages);
    } catch (err) {
        console.error('Model call error:', err);
        return NextResponse.json(
            { error: 'AI service temporarily unavailable. Please try again.' },
            { status: 502 },
        );
    }

    if (!aiResponse.ok) {
        const errorText = await aiResponse.text().catch(() => 'Unknown error');
        console.error(`${model} API error:`, aiResponse.status, errorText);
        let userMessage = 'AI service temporarily unavailable. Please try again.';
        try {
            const parsed = JSON.parse(errorText);
            if (parsed?.error?.message) userMessage = parsed.error.message;
        } catch { /* use default */ }
        return NextResponse.json({ error: userMessage }, { status: 502 });
    }

    // 9. Stream the response back to the client
    const chatId = body.chatId;
    const selectedModel = model;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Choose the right delta parser
    const parseDelta = selectedModel === 'basic' ? parseGeminiDelta : parseOpenAIDelta;

    const stream = new ReadableStream({
        async start(controller) {
            let fullContent = '';
            const reader = aiResponse.body!.getReader();

            try {
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;
                        const data = trimmed.slice(6);
                        if (data === '[DONE]') continue;

                        const delta = parseDelta(data);
                        if (delta) {
                            fullContent += delta;
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`),
                            );
                        }
                    }
                }
            } catch (err) {
                console.error('Stream error:', err);
            } finally {
                // 10. Save response + count usage ONLY on success
                if (fullContent.trim()) {
                    await db.addMessageToChat(chatId, 'assistant', fullContent);
                    await db.incrementUserModelUsage(username, selectedModel);
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
