import { NextResponse } from 'next/server';
import { getKeyStatus } from '@/lib/keys';

// GET /api/status — public endpoint, returns remaining requests today
export async function GET() {
    try {
        const status = await getKeyStatus();
        return NextResponse.json(status);
    } catch {
        return NextResponse.json({ total: 250, remaining: 250 });
    }
}
