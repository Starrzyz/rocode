'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    onPlanChange?: () => void;
}

type SubPage = 'main' | 'tos' | 'privacy';

interface UsageInfo {
    used: number;
    limit: number;     // -1 = unlimited
    remaining: number;  // -1 = unlimited
}

export default function SettingsModal({ isOpen, onClose, username, onPlanChange }: SettingsModalProps) {
    const router = useRouter();
    const [subPage, setSubPage] = useState<SubPage>('main');
    const [plan, setPlan] = useState('free');
    const [planLabel, setPlanLabel] = useState('Free');
    const [planBadge, setPlanBadge] = useState('');
    const [basicUsage, setBasicUsage] = useState<UsageInfo | null>(null);
    const [maxUsage, setMaxUsage] = useState<UsageInfo | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/status');
            if (res.ok) {
                const data = await res.json();
                setPlan(data.plan);
                setPlanLabel(data.planLabel);
                setPlanBadge(data.planBadge);
                setBasicUsage(data.usage?.basic || null);
                setMaxUsage(data.usage?.max || null);
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        setSubPage('main');
        fetchStatus();
        const interval = setInterval(fetchStatus, 30_000);
        return () => clearInterval(interval);
    }, [isOpen, fetchStatus]);

    if (!isOpen) return null;

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        try {
            const res = await fetch('/api/billing/portal', {
                method: 'POST',
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                window.open(data.url, '_blank');
            }
        } catch { /* silent */ }
        setPortalLoading(false);
    };

    const renderUsageBar = (label: string, usage: UsageInfo | null, emoji: string) => {
        if (!usage) return null;
        const isUnlimited = usage.limit === -1;
        const percent = isUnlimited ? 0 : usage.limit > 0 ? (usage.used / usage.limit) * 100 : 0;

        return (
            <div className="bg-[#f7f7f8] rounded-xl px-4 py-3 mb-2">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#1a1a1a]">{emoji} {label}</span>
                    <span className="text-sm font-semibold text-[#1a1a1a]">
                        {isUnlimited
                            ? `${usage.used} used · ∞`
                            : usage.limit === 0
                                ? 'Not available'
                                : `${usage.remaining} / ${usage.limit}`
                        }
                    </span>
                </div>
                {usage.limit !== 0 && (
                    <div className="w-full h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: isUnlimited ? '0%' : `${Math.min(percent, 100)}%`,
                                backgroundColor: percent > 80 ? '#ef4444' : percent > 50 ? '#f59e0b' : '#22c55e',
                            }}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fadeIn p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full max-w-md max-h-[80vh] overflow-hidden animate-fadeInUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
                    <div className="flex items-center gap-2">
                        {subPage !== 'main' && (
                            <button
                                onClick={() => setSubPage('main')}
                                className="p-1 rounded-lg hover:bg-[#f0f0f1] transition-colors cursor-pointer"
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M11 4L6 9l5 5" />
                                </svg>
                            </button>
                        )}
                        <h2 className="text-base font-semibold text-[#1a1a1a]">
                            {subPage === 'main' ? 'Settings' : subPage === 'tos' ? 'Terms of Service' : 'Privacy Policy'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-[#f0f0f1] transition-colors text-[#999] hover:text-[#1a1a1a] cursor-pointer"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M4 4l10 10M14 4L4 14" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(80vh-60px)] scrollbar-thin">
                    {subPage === 'main' && (
                        <div className="p-6 space-y-5">
                            {/* Account + Plan */}
                            <div>
                                <p className="text-xs font-medium text-[#999] uppercase tracking-wider mb-2">Account</p>
                                <div className="bg-[#f7f7f8] rounded-xl px-4 py-3 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-[#1a1a1a] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                        {username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-[#1a1a1a]">{username}</p>
                                            {planBadge && (
                                                <span className="text-xs font-semibold bg-[#1a1a1a] text-white rounded-full px-2 py-0.5">
                                                    {planBadge} {planLabel}
                                                </span>
                                            )}
                                            {plan === 'free' && (
                                                <span className="text-xs text-[#999] bg-[#e5e5e5] rounded-full px-2 py-0.5">Free</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[#999]">Rocode User</p>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Usage */}
                            <div>
                                <p className="text-xs font-medium text-[#999] uppercase tracking-wider mb-2">Daily Usage</p>
                                {renderUsageBar('Basic Model', basicUsage, '⚡')}
                                {renderUsageBar('Max Model', maxUsage, '🔥')}
                                <p className="text-xs text-[#999] mt-1">
                                    Resets daily at midnight UTC.
                                </p>
                            </div>

                            {/* Plan Actions */}
                            <div>
                                <p className="text-xs font-medium text-[#999] uppercase tracking-wider mb-2">Subscription</p>
                                {plan === 'free' ? (
                                    <button
                                        onClick={() => { onClose(); router.push('/pricing'); }}
                                        className="w-full py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors cursor-pointer"
                                    >
                                        Upgrade to Pro or Dev
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleManageSubscription}
                                        disabled={portalLoading}
                                        className="w-full py-2.5 bg-[#f7f7f8] text-[#1a1a1a] rounded-xl text-sm font-medium hover:bg-[#e5e5e5] transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        {portalLoading ? 'Opening…' : 'Manage Subscription'}
                                    </button>
                                )}
                            </div>

                            {/* About */}
                            <div>
                                <p className="text-xs font-medium text-[#999] uppercase tracking-wider mb-2">About</p>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => setSubPage('tos')}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#f0f0f1] transition-colors cursor-pointer group"
                                    >
                                        <span className="text-sm text-[#1a1a1a]">Terms of Service</span>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5" className="group-hover:stroke-[#1a1a1a] transition-colors">
                                            <path d="M6 4l4 4-4 4" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setSubPage('privacy')}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#f0f0f1] transition-colors cursor-pointer group"
                                    >
                                        <span className="text-sm text-[#1a1a1a]">Privacy Policy</span>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5" className="group-hover:stroke-[#1a1a1a] transition-colors">
                                            <path d="M6 4l4 4-4 4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Version */}
                            <div className="text-center pt-2">
                                <p className="text-xs text-[#ccc]">Rocode v3.0 — Gemini + DeepSeek</p>
                            </div>
                        </div>
                    )}

                    {subPage === 'tos' && (
                        <div className="p-6 prose-sm">
                            <div className="space-y-4 text-sm text-[#4a4a4a] leading-relaxed">
                                <p className="text-xs text-[#999]">Last updated: February 2026</p>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">1. Acceptance of Terms</h3>
                                    <p>By using Rocode (&quot;the Service&quot;), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">2. Description of Service</h3>
                                    <p>Rocode is an AI-powered coding assistant for Roblox Luau development. The Service provides code suggestions, debugging help, and learning resources. Responses are generated by AI and may not always be accurate.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">3. Subscription Plans</h3>
                                    <p>The Service offers Free, Pro (€8/month), and Dev (€22/month) plans. Payments are processed securely through Stripe. You can cancel your subscription at any time through the billing portal. Cancellation takes effect at the end of the current billing period.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">4. User Accounts</h3>
                                    <p>You are responsible for maintaining the confidentiality of your account credentials. You must not share your account or use another user&apos;s account. We reserve the right to suspend accounts that violate these terms.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">5. Acceptable Use</h3>
                                    <p>You agree not to: use the Service for illegal purposes; attempt to exploit, hack, or disrupt the Service; submit malicious content or prompts designed to circumvent safety measures; use automated tools to abuse the Service beyond fair use limits.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">6. Rate Limits</h3>
                                    <p>Each plan has specific daily usage limits for each AI model. When limits are reached, the corresponding model will be unavailable until the next day (UTC midnight reset). We may adjust these limits at any time.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">7. AI-Generated Content</h3>
                                    <p>All code and responses are generated by AI. We make no guarantees about the accuracy, safety, or suitability of generated content. Always review and test any code before using it in production.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">8. Limitation of Liability</h3>
                                    <p>The Service is provided &quot;as is&quot; without warranties. We are not liable for any damages resulting from the use of the Service or AI-generated content.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {subPage === 'privacy' && (
                        <div className="p-6 prose-sm">
                            <div className="space-y-4 text-sm text-[#4a4a4a] leading-relaxed">
                                <p className="text-xs text-[#999]">Last updated: February 2026</p>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">1. Information We Collect</h3>
                                    <p><strong>Account data:</strong> Username and hashed password (we never store plaintext passwords). <strong>Chat data:</strong> Messages you send and AI responses, stored to provide chat history. <strong>Usage data:</strong> Per-user request counts for plan limit enforcement. <strong>Payment data:</strong> Processed by Stripe — we never store your card details.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">2. How We Use Your Data</h3>
                                    <p>Your data is used solely to provide the Service: authenticating your account, storing your chat history, enforcing usage limits, processing payments, and improving the Service.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">3. Data Storage</h3>
                                    <p>Data is stored securely using Upstash Redis with encryption in transit. Passwords are hashed using bcrypt with 12 salt rounds. Session tokens are stored in secure, httpOnly cookies.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">4. Third-Party Services</h3>
                                    <p>We use the following third-party services: <strong>Google AI</strong> and <strong>DeepSeek</strong> (AI model providers — your messages are sent to generate responses), <strong>Stripe</strong> (payment processing), <strong>Upstash</strong> (database hosting), <strong>Vercel</strong> (application hosting). Each has its own privacy policy.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">5. Data Sharing</h3>
                                    <p>We do not sell your data. Your messages are sent to AI models to generate responses. Payment data is processed by Stripe. We do not share your data with any other third parties.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">6. Data Retention</h3>
                                    <p>Chat history retention depends on your plan: Free (7 days), Pro (30 days), Dev (unlimited). Account data is retained while your account is active. Usage counters expire automatically after 48 hours.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">7. Your Rights</h3>
                                    <p>You can delete individual chats at any time. You can cancel your subscription through the billing portal. You can request deletion of your account and all associated data by contacting us.</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">8. Security</h3>
                                    <p>We implement industry-standard security measures including password hashing, encrypted cookies, rate limiting, input validation, and Stripe webhook signature verification to protect your data.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
