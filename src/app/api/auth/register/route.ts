import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, getUser } from '@/lib/db';
import { createSession, getSessionCookie } from '@/lib/session';
import { validateCredentials, badRequest, parseBody } from '@/lib/security';

export async function POST(request: NextRequest) {
    const body = await parseBody<{ username: string; password: string }>(request);
    if (!body) return badRequest('Invalid request body.');

    const { username, password } = body;
    const check = validateCredentials(username, password);
    if (!check.ok) return badRequest(check.msg!);

    // Check if user already exists
    const existing = await getUser(username);
    if (existing) return badRequest('Username already taken.');

    // Hash password and create user
    const hash = await bcrypt.hash(password, 12);
    await createUser(username, hash);

    // Create session
    const token = await createSession(username.toLowerCase());
    const cookie = getSessionCookie(token);

    const response = NextResponse.json({ ok: true, username: username.toLowerCase() });
    response.cookies.set(cookie);
    return response;
}
