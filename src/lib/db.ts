import { Redis } from '@upstash/redis';
import type { Chat, Message } from './chat';
import type { PlanId, ModelId } from './plans';

// Initialize Redis client — uses env vars automatically on Vercel
const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

// ── Users ──────────────────────────────────────────

interface StoredUser {
    username: string;
    passwordHash: string;
    createdAt: number;
    plan?: PlanId;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
}

export async function getUser(username: string): Promise<StoredUser | null> {
    return redis.get<StoredUser>(`user:${username.toLowerCase()}`);
}

export async function createUser(username: string, passwordHash: string): Promise<void> {
    const user: StoredUser = {
        username: username.toLowerCase(),
        passwordHash,
        createdAt: Date.now(),
        plan: 'free',
    };
    await redis.set(`user:${username.toLowerCase()}`, user);
}

export async function getUserPlan(username: string): Promise<PlanId> {
    const user = await getUser(username);
    return user?.plan || 'free';
}

export async function setUserPlan(
    username: string,
    plan: PlanId,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string,
): Promise<void> {
    const user = await getUser(username);
    if (!user) return;
    user.plan = plan;
    if (stripeCustomerId) user.stripeCustomerId = stripeCustomerId;
    if (stripeSubscriptionId) user.stripeSubscriptionId = stripeSubscriptionId;
    await redis.set(`user:${username.toLowerCase()}`, user);
}

export async function getStripeCustomerId(username: string): Promise<string | undefined> {
    const user = await getUser(username);
    return user?.stripeCustomerId;
}

export async function findUserByStripeCustomerId(customerId: string): Promise<string | null> {
    // Scan for user with this Stripe customer ID
    // In a production app you'd have a reverse index, but for small user bases this works
    let cursor = 0;
    do {
        const [nextCursor, keys] = await redis.scan(cursor, { match: 'user:*', count: 100 });
        cursor = typeof nextCursor === 'string' ? parseInt(nextCursor) : nextCursor;
        for (const key of keys) {
            const user = await redis.get<StoredUser>(key as string);
            if (user?.stripeCustomerId === customerId) {
                return user.username;
            }
        }
    } while (cursor !== 0);
    return null;
}

// ── Chats ──────────────────────────────────────────

export async function getUserChats(username: string): Promise<Chat[]> {
    const chatIds = await redis.lrange<string>(`chats:${username}`, 0, -1);
    if (!chatIds || chatIds.length === 0) return [];

    const pipeline = redis.pipeline();
    for (const id of chatIds) {
        pipeline.get(`chat:${id}`);
    }
    const results = await pipeline.exec<(Chat | null)[]>();
    return results.filter((c): c is Chat => c !== null);
}

export async function getChat(chatId: string): Promise<Chat | null> {
    return redis.get<Chat>(`chat:${chatId}`);
}

export async function createChat(username: string): Promise<Chat> {
    const id = 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const chat: Chat = {
        id,
        user: username,
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    await redis.set(`chat:${id}`, chat);
    await redis.lpush(`chats:${username}`, id);
    return chat;
}

export async function deleteChat(chatId: string, username: string): Promise<void> {
    await redis.del(`chat:${chatId}`);
    await redis.lrem(`chats:${username}`, 0, chatId);
}

export async function addMessageToChat(
    chatId: string,
    role: 'user' | 'assistant',
    content: string,
): Promise<Chat | null> {
    const chat = await getChat(chatId);
    if (!chat) return null;

    const msg: Message = { role, content, timestamp: Date.now() };
    chat.messages.push(msg);
    chat.updatedAt = Date.now();

    // Auto-title after first user message
    if (role === 'user' && chat.messages.filter((m) => m.role === 'user').length === 1) {
        chat.title = content.length > 40 ? content.slice(0, 40) + '…' : content;
    }

    await redis.set(`chat:${chatId}`, chat);
    return chat;
}

// ── Per-User Model Usage Tracking ──────────────────

function todayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function getUserModelUsage(username: string, model: ModelId): Promise<number> {
    const key = `usage:${todayKey()}:${username}:${model}`;
    const count = await redis.get<number>(key);
    return count || 0;
}

export async function incrementUserModelUsage(username: string, model: ModelId): Promise<number> {
    const key = `usage:${todayKey()}:${username}:${model}`;
    const count = await redis.incr(key);
    // Auto-expire after 48h
    if (count === 1) {
        await redis.expire(key, 48 * 60 * 60);
    }
    return count;
}

// ── Rate Limiting ──────────────────────────────────

export async function checkRateLimit(username: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rate:${username}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 15; // 15 req/min matches Gemini rate limit

    // Clean old entries and count recent ones
    await redis.zremrangebyscore(key, 0, now - windowMs);
    const count = await redis.zcard(key);

    if (count >= maxRequests) {
        return { allowed: false, remaining: 0 };
    }

    // Add this request
    await redis.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    await redis.expire(key, 120);

    return { allowed: true, remaining: maxRequests - count - 1 };
}

export { redis };
