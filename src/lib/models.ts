// ── AI Model Callers ──────────────────────────────
// Basic = Gemini 2.0 Flash Lite (Google AI Studio)
// Max   = DeepSeek V3 (api.deepseek.com, OpenAI-compatible)

import type { ModelId } from './plans';

const SYSTEM_PROMPT = `You are Rocode, an AI coding assistant specialized in Roblox development with Luau.
You help users write scripts, debug code, and learn Roblox game development.
Be concise, helpful, and provide working code examples when relevant.
Use Luau syntax (not Lua 5.x). Format code blocks with \`\`\`lua.`;

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Call the appropriate AI API and return a streaming Response.
 * Both Gemini and DeepSeek return SSE that we normalize.
 */
export async function callModel(
    model: ModelId,
    messages: ChatMessage[],
    maxTokens: number = 2048,
): Promise<Response> {
    if (model === 'max') {
        return callDeepSeek(messages, maxTokens);
    }
    return callGemini(messages, maxTokens);
}

// ── Gemini 2.0 Flash Lite ─────────────────────────

async function callGemini(messages: ChatMessage[], maxTokens: number): Promise<Response> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    // Convert chat messages to Gemini format
    const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

    const systemInstruction = messages.find((m) => m.role === 'system');

    const body: Record<string, unknown> = {
        contents,
        generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7,
        },
    };

    if (systemInstruction) {
        body.systemInstruction = {
            parts: [{ text: systemInstruction.content }],
        };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:streamGenerateContent?alt=sse&key=${apiKey}`;

    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

// ── DeepSeek V3 ───────────────────────────────────

async function callDeepSeek(messages: ChatMessage[], maxTokens: number): Promise<Response> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');

    return fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages,
            stream: true,
            max_tokens: maxTokens,
            temperature: 0.7,
        }),
    });
}

/**
 * Build the messages array for the AI call.
 */
export function buildMessages(
    chatMessages: { role: string; content: string }[],
): ChatMessage[] {
    return [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        })),
    ];
}

/**
 * Parse a Gemini SSE chunk and extract the text delta.
 * Gemini returns: data: {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}
 */
export function parseGeminiDelta(data: string): string | null {
    try {
        const parsed = JSON.parse(data);
        return parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch {
        return null;
    }
}

/**
 * Parse an OpenAI-compatible SSE chunk (DeepSeek) and extract the text delta.
 * Returns: data: {"choices":[{"delta":{"content":"..."}}]}
 */
export function parseOpenAIDelta(data: string): string | null {
    try {
        const parsed = JSON.parse(data);
        return parsed?.choices?.[0]?.delta?.content ?? null;
    } catch {
        return null;
    }
}
