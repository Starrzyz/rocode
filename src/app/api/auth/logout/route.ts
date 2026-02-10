import { NextResponse } from 'next/server';
import { getClearSessionCookie } from '@/lib/session';

export async function POST() {
    const cookie = getClearSessionCookie();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookie);
    return response;
}
