'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function PricingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const handleUpgrade = async (plan: 'pro' | 'dev') => {
        if (!user) {
            router.push('/login');
            return;
        }

        setLoadingPlan(plan);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
                credentials: 'same-origin',
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                }
            } else {
                const err = await res.json().catch(() => ({}));
                alert((err as { error?: string }).error || 'Something went wrong.');
            }
        } catch {
            alert('Failed to start checkout. Please try again.');
        }
        setLoadingPlan(null);
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-[#e5e5e5]">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/chat')}
                        className="flex items-center gap-2 text-sm text-[#999] hover:text-[#1a1a1a] transition-colors cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 4L6 8l4 4" />
                        </svg>
                        Back to Chat
                    </button>
                    <img src="/Logo.png" alt="Rocode" className="h-6" />
                </div>
            </header>

            {/* Pricing Content */}
            <div className="max-w-5xl mx-auto px-6 py-16">
                <div className="text-center mb-14">
                    <h1 className="text-3xl font-bold text-[#1a1a1a] mb-3">Choose your plan</h1>
                    <p className="text-[#999] text-base max-w-md mx-auto">
                        Unlock more powerful AI models and higher limits to supercharge your Roblox development.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {/* Free Plan */}
                    <div className="relative border border-[#e5e5e5] rounded-2xl p-6 flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-[#1a1a1a]">Free</h3>
                            <div className="mt-2">
                                <span className="text-3xl font-bold text-[#1a1a1a]">€0</span>
                                <span className="text-sm text-[#999]">/month</span>
                            </div>
                            <p className="text-xs text-[#999] mt-2">Get started with Rocode</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <Feature text="10 Basic messages/day" />
                            <Feature text="Gemini Flash Lite model" />
                            <Feature text="7-day chat history" />
                            <Feature text="2,000 char message limit" />
                            <FeatureNo text="Max model access" />
                            <FeatureNo text="Code export" />
                        </ul>
                        <button
                            className="w-full py-2.5 rounded-xl bg-[#f7f7f8] text-[#999] text-sm font-medium cursor-default"
                            disabled
                        >
                            Current Plan
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div className="relative border-2 border-[#1a1a1a] rounded-2xl p-6 flex flex-col">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-xs font-semibold px-3 py-1 rounded-full">
                            Most Popular
                        </div>
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-[#1a1a1a]">⚡ Pro</h3>
                            <div className="mt-2">
                                <span className="text-3xl font-bold text-[#1a1a1a]">€8</span>
                                <span className="text-sm text-[#999]">/month</span>
                            </div>
                            <p className="text-xs text-[#999] mt-2">For serious Roblox developers</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <Feature text="Unlimited Basic messages" highlight />
                            <Feature text="5 Max messages/day" />
                            <Feature text="DeepSeek V3 access" />
                            <Feature text="30-day chat history" />
                            <Feature text="8,000 char message limit" />
                            <Feature text="Priority responses" />
                            <Feature text="Code export" />
                        </ul>
                        <button
                            onClick={() => handleUpgrade('pro')}
                            disabled={loadingPlan === 'pro'}
                            className="w-full py-2.5 rounded-xl bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {loadingPlan === 'pro' ? 'Redirecting…' : 'Upgrade to Pro'}
                        </button>
                    </div>

                    {/* Dev Plan */}
                    <div className="relative border border-[#e5e5e5] rounded-2xl p-6 flex flex-col bg-gradient-to-b from-white to-[#fafafa]">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-[#1a1a1a]">🔥 Dev</h3>
                            <div className="mt-2">
                                <span className="text-3xl font-bold text-[#1a1a1a]">€22</span>
                                <span className="text-sm text-[#999]">/month</span>
                            </div>
                            <p className="text-xs text-[#999] mt-2">Maximum power, no compromises</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <Feature text="Unlimited Basic messages" highlight />
                            <Feature text="50 Max messages/day" highlight />
                            <Feature text="DeepSeek V3 access" />
                            <Feature text="Unlimited chat history" />
                            <Feature text="16,000 char message limit" />
                            <Feature text="Priority responses" />
                            <Feature text="Code export" />
                        </ul>
                        <button
                            onClick={() => handleUpgrade('dev')}
                            disabled={loadingPlan === 'dev'}
                            className="w-full py-2.5 rounded-xl bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {loadingPlan === 'dev' ? 'Redirecting…' : 'Upgrade to Dev'}
                        </button>
                    </div>
                </div>

                {/* FAQ section */}
                <div className="max-w-2xl mx-auto mt-20">
                    <h2 className="text-xl font-semibold text-[#1a1a1a] text-center mb-8">Frequently Asked Questions</h2>
                    <div className="space-y-6">
                        <FAQ
                            q="Can I cancel anytime?"
                            a="Yes! You can cancel your subscription at any time through the billing portal. You'll keep your plan until the end of the current billing period."
                        />
                        <FAQ
                            q="What's the difference between Basic and Max models?"
                            a="Basic uses Gemini 2.0 Flash Lite — fast and reliable for everyday coding tasks. Max uses DeepSeek V3 — the best available model for complex coding, debugging, and advanced Luau development."
                        />
                        <FAQ
                            q="What happens when I hit my daily limit?"
                            a="You'll see a message indicating you've reached your limit. Limits reset daily at midnight UTC. Upgrade your plan for higher limits or unlimited access."
                        />
                        <FAQ
                            q="Is payment secure?"
                            a="Absolutely. All payments are processed by Stripe, a PCI-compliant payment processor. We never see or store your card details."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function Feature({ text, highlight }: { text: string; highlight?: boolean }) {
    return (
        <li className="flex items-start gap-2 text-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#22c55e" strokeWidth="2" className="mt-0.5 shrink-0">
                <path d="M3 8l3.5 3.5L13 5" />
            </svg>
            <span className={highlight ? 'font-medium text-[#1a1a1a]' : 'text-[#4a4a4a]'}>{text}</span>
        </li>
    );
}

function FeatureNo({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-2 text-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#ccc" strokeWidth="1.5" className="mt-0.5 shrink-0">
                <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
            <span className="text-[#ccc]">{text}</span>
        </li>
    );
}

function FAQ({ q, a }: { q: string; a: string }) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">{q}</h3>
            <p className="text-sm text-[#4a4a4a] leading-relaxed">{a}</p>
        </div>
    );
}
