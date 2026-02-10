import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import * as db from '@/lib/db';
import { unauthorized } from '@/lib/security';

// GET /api/chats/[id] — get a single chat with messages
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const username = await verifySession(request);
    if (!username) return unauthorized();

    const { id } = await params;
    const chat = await db.getChat(id);
    if (!chat || chat.user !== username) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ chat });
}

// DELETE /api/chats/[id] — delete a chat
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const username = await verifySession(request);
    if (!username) return unauthorized();

    const { id } = await params;
    const chat = await db.getChat(id);
    if (!chat || chat.user !== username) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    await db.deleteChat(id, username);
    return NextResponse.json({ ok: true });
}
