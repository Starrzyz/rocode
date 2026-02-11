import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import * as db from '@/lib/db';
import { createCheckoutSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
    // Auth check
    const username = await verifySession(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    let body: { plan?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const plan = body.plan;
    if (plan !== 'pro' && plan !== 'dev') {
        return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }

    // Check if already on this plan
    const currentPlan = await db.getUserPlan(username);
    if (currentPlan === plan) {
        return NextResponse.json({ error: 'You are already on this plan.' }, { status: 400 });
    }

    // Get existing Stripe customer ID if any
    const customerId = await db.getStripeCustomerId(username);

    try {
        const url = await createCheckoutSession(plan, username, customerId);
        return NextResponse.json({ url });
    } catch (err) {
        console.error('Checkout error:', err);
        return NextResponse.json(
            { error: 'Failed to create checkout session.' },
            { status: 500 },
        );
    }
}
