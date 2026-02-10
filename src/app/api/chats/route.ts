import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import * as db from '@/lib/db';
import { unauthorized } from '@/lib/security';

// GET /api/chats — list user's chats
export async function GET(request: NextRequest) {
    const username = await verifySession(request);
    if (!username) return unauthorized();

    const chats = await db.getUserChats(username);
    // Sort by updatedAt descending and strip messages for list view
    const list = chats
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }));

    return NextResponse.json({ chats: list });
}

// POST /api/chats — create a new chat
export async function POST(request: NextRequest) {
    const username = await verifySession(request);
    if (!username) return unauthorized();

    const chat = await db.createChat(username);
    return NextResponse.json({ chat });
}
