import Stripe from 'stripe';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
    if (!_stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY not configured');
        }
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2026-01-28.clover',
        });
    }
    return _stripe;
}

export { getStripe as stripe };

/**
 * Map Stripe Price IDs to plan names.
 */
export function getPlanFromPriceId(priceId: string): 'pro' | 'dev' | null {
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
    if (priceId === process.env.STRIPE_DEV_PRICE_ID) return 'dev';
    return null;
}

/**
 * Create a Stripe Checkout Session for a subscription.
 */
export async function createCheckoutSession(
    plan: 'pro' | 'dev',
    username: string,
    customerId?: string,
): Promise<string> {
    const priceId = plan === 'pro'
        ? process.env.STRIPE_PRO_PRICE_ID!
        : process.env.STRIPE_DEV_PRICE_ID!;

    const params: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${getBaseUrl()}/chat?upgraded=true`,
        cancel_url: `${getBaseUrl()}/pricing`,
        subscription_data: {
            metadata: { username },
        },
    };

    if (customerId) {
        params.customer = customerId;
    } else {
        params.customer_email = undefined; // Let Stripe collect email
    }

    const session = await getStripe().checkout.sessions.create(params);
    return session.url!;
}

/**
 * Create a Stripe Customer Portal session.
 */
export async function createPortalSession(customerId: string): Promise<string> {
    const session = await getStripe().billingPortal.sessions.create({
        customer: customerId,
        return_url: `${getBaseUrl()}/chat`,
    });
    return session.url;
}

function getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://rocode-zeta.vercel.app';
}
