import { NextRequest, NextResponse } from 'next/server';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_USERNAME_LENGTH = 30;
const MAX_PASSWORD_LENGTH = 128;

export function validateMessage(content: unknown, maxLength: number = MAX_MESSAGE_LENGTH): { ok: boolean; msg?: string } {
    if (typeof content !== 'string') return { ok: false, msg: 'Message must be a string.' };
    const trimmed = content.trim();
    if (!trimmed) return { ok: false, msg: 'Message cannot be empty.' };
    if (trimmed.length > maxLength) {
        return { ok: false, msg: `Message too long (max ${maxLength} characters).` };
    }
    return { ok: true };
}

export function validateCredentials(
    username: unknown,
    password: unknown,
): { ok: boolean; msg?: string } {
    if (typeof username !== 'string' || typeof password !== 'string') {
        return { ok: false, msg: 'Invalid input.' };
    }
    if (!username.trim() || !password) {
        return { ok: false, msg: 'Please fill in all fields.' };
    }
    if (username.length < 3) return { ok: false, msg: 'Username must be at least 3 characters.' };
    if (username.length > MAX_USERNAME_LENGTH) return { ok: false, msg: 'Username too long.' };
    if (password.length < 4) return { ok: false, msg: 'Password must be at least 4 characters.' };
    if (password.length > MAX_PASSWORD_LENGTH) return { ok: false, msg: 'Password too long.' };
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return { ok: false, msg: 'Username can only contain letters, numbers, _ and -.' };
    }
    return { ok: true };
}

export function unauthorized(): NextResponse {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function badRequest(msg: string): NextResponse {
    return NextResponse.json({ error: msg }, { status: 400 });
}

export function tooManyRequests(remaining: number): NextResponse {
    return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
            status: 429,
            headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(remaining) },
        },
    );
}

export async function parseBody<T>(request: NextRequest): Promise<T | null> {
    try {
        const text = await request.text();
        if (text.length > 50_000) return null; // 50KB max body
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}
