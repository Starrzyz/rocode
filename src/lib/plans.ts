// ── Plan & Model Definitions ──────────────────────

export type PlanId = 'free' | 'pro' | 'dev';
export type ModelId = 'basic' | 'max';

export interface PlanConfig {
    label: string;
    badge: string;
    basicLimit: number;   // -1 = unlimited
    maxLimit: number;     // 0 = no access, -1 = unlimited
    maxMsgLen: number;
    historyDays: number;  // -1 = unlimited
    priority: boolean;
    codeExport: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
    free: {
        label: 'Free',
        badge: '',
        basicLimit: 10,
        maxLimit: 0,
        maxMsgLen: 2000,
        historyDays: 7,
        priority: false,
        codeExport: false,
    },
    pro: {
        label: 'Pro',
        badge: '⚡',
        basicLimit: -1,
        maxLimit: 5,
        maxMsgLen: 8000,
        historyDays: 30,
        priority: true,
        codeExport: true,
    },
    dev: {
        label: 'Dev',
        badge: '🔥',
        basicLimit: -1,
        maxLimit: 50,
        maxMsgLen: 16000,
        historyDays: -1,
        priority: true,
        codeExport: true,
    },
};

export const MODEL_INFO: Record<ModelId, { label: string; description: string }> = {
    basic: { label: 'Basic', description: 'Gemini 2.0 Flash Lite — fast & reliable' },
    max: { label: 'Max', description: 'DeepSeek V3 — best quality coding' },
};

/**
 * Check if a user on `plan` can use `model`.
 */
export function canUseModel(plan: PlanId, model: ModelId): boolean {
    if (model === 'basic') return true;
    return PLANS[plan].maxLimit !== 0;
}

/**
 * Get daily message limit for a plan+model combo.
 * Returns -1 for unlimited.
 */
export function getDailyLimit(plan: PlanId, model: ModelId): number {
    const cfg = PLANS[plan];
    return model === 'basic' ? cfg.basicLimit : cfg.maxLimit;
}
