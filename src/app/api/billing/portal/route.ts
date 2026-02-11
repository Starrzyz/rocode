import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import * as db from '@/lib/db';
import { createPortalSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
    const username = await verifySession(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = await db.getStripeCustomerId(username);
    if (!customerId) {
        return NextResponse.json(
            { error: 'No active subscription found.' },
            { status: 400 },
        );
    }

    try {
        const url = await createPortalSession(customerId);
        return NextResponse.json({ url });
    } catch (err) {
        console.error('Portal error:', err);
        return NextResponse.json(
            { error: 'Failed to open billing portal.' },
            { status: 500 },
        );
    }
}
