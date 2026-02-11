import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import * as db from '@/lib/db';
import { PLANS, getDailyLimit } from '@/lib/plans';
import type { ModelId } from '@/lib/plans';

export async function GET(request: NextRequest) {
    const username = await verifySession(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = await db.getUserPlan(username);
    const planConfig = PLANS[plan];

    const models: ModelId[] = ['basic', 'max'];
    const usage: Record<string, { used: number; limit: number; remaining: number }> = {};

    for (const model of models) {
        const limit = getDailyLimit(plan, model);
        const used = await db.getUserModelUsage(username, model);
        usage[model] = {
            used,
            limit, // -1 = unlimited
            remaining: limit === -1 ? -1 : Math.max(0, limit - used),
        };
    }

    return NextResponse.json({
        plan,
        planLabel: planConfig.label,
        planBadge: planConfig.badge,
        usage,
    });
}
