import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'rocode_session';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-change-me');

export async function createSession(username: string): Promise<string> {
    const token = await new SignJWT({ username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

    return token;
}

export function getSessionCookie(token: string) {
    return {
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
    };
}

export function getClearSessionCookie() {
    return {
        name: COOKIE_NAME,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 0,
    };
}

export async function verifySession(request: NextRequest): Promise<string | null> {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, secret);
        return (payload.username as string) || null;
    } catch {
        return null;
    }
}

export async function getSessionFromCookies(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, secret);
        return (payload.username as string) || null;
    } catch {
        return null;
    }
}
