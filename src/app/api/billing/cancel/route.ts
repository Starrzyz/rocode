import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import * as db from '@/lib/db';
import { stripe as getStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
    const username = await verifySession(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.getUser(username);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stripeSubscriptionId = (user as { stripeSubscriptionId?: string }).stripeSubscriptionId;
    if (!stripeSubscriptionId) {
        return NextResponse.json({ error: 'No active subscription.' }, { status: 400 });
    }

    try {
        // Cancel immediately (not at period end)
        await getStripe().subscriptions.cancel(stripeSubscriptionId);
        await db.setUserPlan(username, 'free');

        return NextResponse.json({ success: true, message: 'Subscription cancelled immediately.' });
    } catch (err) {
        console.error('Cancel error:', err);
        return NextResponse.json({ error: 'Failed to cancel subscription.' }, { status: 500 });
    }
}
