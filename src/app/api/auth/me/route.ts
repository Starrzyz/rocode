import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';

export async function GET(request: NextRequest) {
    const username = await verifySession(request);
    if (!username) {
        return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ user: username });
}
