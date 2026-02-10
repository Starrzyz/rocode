import { getAllKeyUsages, incrementKeyUsage } from './db';

const DAILY_LIMIT = 50;

export class DailyLimitError extends Error {
    constructor() {
        super('Daily request limit reached across all API keys. Please try again tomorrow.');
        this.name = 'DailyLimitError';
    }
}

function getKeys(): string[] {
    const keys: string[] = [];
    for (let i = 1; i <= 5; i++) {
        const key = process.env[`OPENROUTER_KEY_${i}`];
        if (key) keys.push(key);
    }
    return keys;
}

/**
 * Smart key rotation: picks the key with the lowest usage count today.
 * If all keys have reached the daily limit, throws DailyLimitError.
 * Atomically increments the chosen key's usage counter.
 */
/**
 * Smart key rotation: picks the key with the lowest usage count today.
 * Does NOT increment the counter — call confirmKeyUsage() after a successful request.
 */
export async function pickNextKey(): Promise<{ key: string; keyIndex: number }> {
    const keys = getKeys();
    if (keys.length === 0) {
        throw new Error('No OpenRouter API keys configured');
    }

    const usages = await getAllKeyUsages();

    let bestIndex = -1;
    let bestUsage = Infinity;

    for (let i = 0; i < keys.length; i++) {
        const usage = usages[i] ?? 0;
        if (usage < DAILY_LIMIT && usage < bestUsage) {
            bestIndex = i;
            bestUsage = usage;
        }
    }

    if (bestIndex === -1) {
        throw new DailyLimitError();
    }

    return { key: keys[bestIndex], keyIndex: bestIndex + 1 };
}

/**
 * Increment usage counter for a key — call only after a successful AI response.
 */
export async function confirmKeyUsage(keyIndex: number): Promise<void> {
    await incrementKeyUsage(keyIndex);
}

/**
 * Returns current usage status for monitoring.
 */
export async function getKeyStatus(): Promise<{ total: number; remaining: number }> {
    const keys = getKeys();
    const usages = await getAllKeyUsages();

    const totalCapacity = keys.length * DAILY_LIMIT;
    const totalUsed = usages.slice(0, keys.length).reduce((a, b) => a + b, 0);

    return {
        total: totalCapacity,
        remaining: Math.max(0, totalCapacity - totalUsed),
    };
}
