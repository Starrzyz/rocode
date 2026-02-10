import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUser } from '@/lib/db';
import { createSession, getSessionCookie } from '@/lib/session';
import { validateCredentials, badRequest, parseBody } from '@/lib/security';

export async function POST(request: NextRequest) {
    const body = await parseBody<{ username: string; password: string }>(request);
    if (!body) return badRequest('Invalid request body.');

    const { username, password } = body;
    const check = validateCredentials(username, password);
    if (!check.ok) return badRequest(check.msg!);

    // Find user
    const user = await getUser(username);
    if (!user) return badRequest('Invalid username or password.');

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return badRequest('Invalid username or password.');

    // Create session
    const token = await createSession(user.username);
    const cookie = getSessionCookie(token);

    const response = NextResponse.json({ ok: true, username: user.username });
    response.cookies.set(cookie);
    return response;
}
