import { NextRequest, NextResponse } from 'next/server';
import { stripe as getStripe, getPlanFromPriceId } from '@/lib/stripe';
import * as db from '@/lib/db';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!,
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                if (subscriptionId) {
                    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
                    const username = subscription.metadata?.username;
                    const priceId = subscription.items.data[0]?.price?.id;
                    const plan = priceId ? getPlanFromPriceId(priceId) : null;

                    if (username && plan) {
                        await db.setUserPlan(username, plan, customerId, subscriptionId);
                        console.log(`Upgraded ${username} to ${plan}`);
                    }
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const username = await db.findUserByStripeCustomerId(customerId);

                if (username) {
                    if (subscription.status === 'active') {
                        const priceId = subscription.items.data[0]?.price?.id;
                        const plan = priceId ? getPlanFromPriceId(priceId) : null;
                        if (plan) {
                            await db.setUserPlan(username, plan, customerId, subscription.id);
                            console.log(`Updated ${username} to ${plan}`);
                        }
                    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
                        await db.setUserPlan(username, 'free');
                        console.log(`Downgraded ${username} to free`);
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const username = await db.findUserByStripeCustomerId(customerId);

                if (username) {
                    await db.setUserPlan(username, 'free');
                    console.log(`Subscription deleted — ${username} reverted to free`);
                }
                break;
            }
        }
    } catch (err) {
        console.error('Webhook handler error:', err);
        // Return 200 anyway to prevent Stripe retries on our processing errors
    }

    return NextResponse.json({ received: true });
}
