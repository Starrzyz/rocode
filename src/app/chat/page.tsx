'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsModal from '@/components/SettingsModal';
import type { Message } from '@/lib/chat';
import type { ModelId } from '@/lib/plans';

interface ChatListItem {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

// Track which model was last used per chat
const chatModelMap = new Map<string, ModelId>();

export default function ChatPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    const [chatList, setChatList] = useState<ChatListItem[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [streamingContent, setStreamingContent] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ModelId>('basic');
    const [userPlan, setUserPlan] = useState<string>('free');
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const [stoppedMessageIndex, setStoppedMessageIndex] = useState<number | undefined>(undefined);

    const streamAbortRef = useRef<AbortController | null>(null);
    const streamingContentRef = useRef<string>('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Auth guard
    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    // Load chat list + plan on mount
    useEffect(() => {
        if (user) {
            refreshChatList();
            fetchPlan();
        }
    }, [user]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setModelDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Register hidden admin console command
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        const subscriptionObj = {
            end: async (mode: string) => {
                if (mode !== 'now') {
                    console.log('%c⚠️ Usage: subscription.end("now")', 'color: #ef4444; font-weight: bold');
                    return;
                }
                console.log('%c🔄 Cancelling subscription...', 'color: #f59e0b; font-weight: bold');
                try {
                    const res = await fetch('/api/billing/cancel', {
                        method: 'POST',
                        credentials: 'same-origin',
                    });
                    if (res.ok) {
                        console.log('%c✅ Subscription cancelled immediately. Refreshing...', 'color: #22c55e; font-weight: bold');
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        const data = await res.json();
                        console.log('%c❌ ' + (data.error || 'Failed'), 'color: #ef4444; font-weight: bold');
                    }
                } catch {
                    console.log('%c❌ Network error', 'color: #ef4444; font-weight: bold');
                }
            },
        };
        win.subscription = subscriptionObj;
        return () => { delete win.subscription; };
    }, []);

    const fetchPlan = useCallback(async () => {
        try {
            const res = await fetch('/api/status', { credentials: 'same-origin' });
            if (res.ok) {
                const data = await res.json();
                setUserPlan(data.plan || 'free');
            }
        } catch { /* silent */ }
    }, []);

    const refreshChatList = useCallback(async () => {
        try {
            const res = await fetch('/api/chats', { credentials: 'same-origin' });
            if (res.ok) {
                const data = await res.json();
                setChatList(data.chats || []);
            }
        } catch { /* silent */ }
    }, []);

    // Load messages when active chat changes — restore model from memory
    useEffect(() => {
        if (!activeChatId) {
            setMessages([]);
            setStoppedMessageIndex(undefined);
            return;
        }
        loadChatMessages(activeChatId);
        // Restore the model that was used for this chat
        const savedModel = chatModelMap.get(activeChatId);
        if (savedModel) {
            setSelectedModel(savedModel);
        }
    }, [activeChatId]);

    const loadChatMessages = async (chatId: string) => {
        try {
            const res = await fetch(`/api/chats/${chatId}`, { credentials: 'same-origin' });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.chat?.messages || []);
            }
        } catch {
            setMessages([]);
        }
    };

    const handleNewChat = useCallback(async () => {
        try {
            const res = await fetch('/api/chats', {
                method: 'POST',
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                setActiveChatId(data.chat.id);
                setStoppedMessageIndex(undefined);
                await refreshChatList();
            }
        } catch { /* silent */ }
        setSidebarOpen(false);
    }, [refreshChatList]);

    const handleSelectChat = useCallback((id: string) => {
        setActiveChatId(id);
        setError(null);
        setStoppedMessageIndex(undefined);
        setSidebarOpen(false);
    }, []);

    const handleDeleteChat = useCallback(
        async (id: string) => {
            try {
                await fetch(`/api/chats/${id}`, {
                    method: 'DELETE',
                    credentials: 'same-origin',
                });
                if (activeChatId === id) {
                    setActiveChatId(null);
                    setMessages([]);
                    setStoppedMessageIndex(undefined);
                }
                chatModelMap.delete(id);
                await refreshChatList();
            } catch { /* silent */ }
        },
        [activeChatId, refreshChatList],
    );

    const handleLogout = useCallback(async () => {
        await logout();
        router.replace('/login');
    }, [logout, router]);

    // Stop streaming — keep partial content as a finalized message
    const handleStop = useCallback(() => {
        if (streamAbortRef.current) {
            streamAbortRef.current.abort();
        }
    }, []);

    // Send message and stream AI response
    const handleSend = useCallback(
        async (text: string) => {
            setError(null);
            setStoppedMessageIndex(undefined);
            let chatId = activeChatId;

            // Create chat if needed
            if (!chatId) {
                try {
                    const res = await fetch('/api/chats', {
                        method: 'POST',
                        credentials: 'same-origin',
                    });
                    if (!res.ok) throw new Error();
                    const data = await res.json();
                    chatId = data.chat.id;
                    setActiveChatId(chatId);
                    await refreshChatList();
                } catch {
                    setError('Failed to create chat.');
                    return;
                }
            }

            // Remember which model is used for this chat
            chatModelMap.set(chatId!, selectedModel);

            // Add user message to state immediately
            const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
            setMessages((prev) => [...prev, userMsg]);
            setIsTyping(true);

            // Start streaming
            const abortController = new AbortController();
            streamAbortRef.current = abortController;
            streamingContentRef.current = '';

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId, message: text, model: selectedModel }),
                    credentials: 'same-origin',
                    signal: abortController.signal,
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    const errMsg = (data as { error?: string }).error || 'Something went wrong.';
                    setError(errMsg);
                    setIsTyping(false);
                    return;
                }

                // Read SSE stream
                setIsTyping(false);
                setIsStreaming(true);

                const reader = res.body!.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;
                        const data = trimmed.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                streamingContentRef.current += parsed.content;
                                setStreamingContent(streamingContentRef.current);
                            }
                        } catch { /* skip */ }
                    }
                }

                // Completed normally — finalize message
                const finalContent = streamingContentRef.current;
                if (finalContent.trim()) {
                    setMessages((prev) => [
                        ...prev,
                        { role: 'assistant', content: finalContent, timestamp: Date.now() },
                    ]);
                }
            } catch (err) {
                if ((err as Error).name === 'AbortError') {
                    // User clicked stop — keep partial content with "stopped" indicator
                    const partialContent = streamingContentRef.current;
                    if (partialContent.trim()) {
                        setMessages((prev) => {
                            const updated = [
                                ...prev,
                                { role: 'assistant' as const, content: partialContent, timestamp: Date.now() },
                            ];
                            // Mark the last message as stopped
                            setStoppedMessageIndex(updated.length - 1);
                            return updated;
                        });
                    }
                } else {
                    setError('Connection failed. Please try again.');
                }
            } finally {
                setStreamingContent(null);
                setIsStreaming(false);
                setIsTyping(false);
                streamAbortRef.current = null;
                streamingContentRef.current = '';
                refreshChatList();
            }
        },
        [activeChatId, refreshChatList, selectedModel],
    );

    if (loading || !user) return null;

    const sidebarChats = chatList.map((c) => ({
        ...c,
        user: user,
        messages: [],
    }));

    const canUseMax = userPlan === 'pro' || userPlan === 'dev';

    return (
        <div className="h-screen flex bg-white overflow-hidden">
            <Sidebar
                chats={sidebarChats}
                activeChatId={activeChatId}
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                onDeleteChat={handleDeleteChat}
                onLogout={handleLogout}
                username={user}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-14 border-b border-[#e5e5e5] flex items-center px-4 md:px-6 shrink-0 bg-white">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden mr-3 p-1.5 rounded-lg hover:bg-[#f0f0f1] transition-colors cursor-pointer"
                        aria-label="Open sidebar"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 5h14M3 10h14M3 15h14" />
                        </svg>
                    </button>
                    <h1 className="text-sm font-medium text-[#1a1a1a] truncate flex-1">
                        {chatList.find((c) => c.id === activeChatId)?.title || 'Rocode'}
                    </h1>

                    {/* Model Selector */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e5] hover:bg-[#f0f0f1] transition-colors cursor-pointer text-xs font-medium text-[#4a4a4a] mr-2"
                        >
                            <span>{selectedModel === 'basic' ? '⚡ Basic' : '🔥 Max'}</span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M3 4.5L6 7.5L9 4.5" />
                            </svg>
                        </button>
                        {modelDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl border border-[#e5e5e5] shadow-[0_4px_20px_rgba(0,0,0,0.08)] z-50 overflow-hidden animate-fadeIn">
                                <button
                                    onClick={() => { setSelectedModel('basic'); setModelDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-3 hover:bg-[#f7f7f8] transition-colors cursor-pointer ${selectedModel === 'basic' ? 'bg-[#f7f7f8]' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-[#1a1a1a]">⚡ Rocode Basic</p>
                                            <p className="text-xs text-[#999] mt-0.5">Fast & reliable for everyday tasks</p>
                                        </div>
                                        {selectedModel === 'basic' && (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#22c55e" strokeWidth="2">
                                                <path d="M3 8l3.5 3.5L13 5" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                                <div className="border-t border-[#e5e5e5]" />
                                <button
                                    onClick={() => {
                                        if (canUseMax) {
                                            setSelectedModel('max');
                                            setModelDropdownOpen(false);
                                        } else {
                                            router.push('/pricing');
                                            setModelDropdownOpen(false);
                                        }
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-[#f7f7f8] transition-colors cursor-pointer ${selectedModel === 'max' ? 'bg-[#f7f7f8]' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-[#1a1a1a]">
                                                🔥 Rocode Max
                                                {!canUseMax && <span className="ml-1.5 text-[10px] font-semibold text-white bg-[#1a1a1a] rounded-full px-1.5 py-0.5">PRO</span>}
                                            </p>
                                            <p className="text-xs text-[#999] mt-0.5">Best quality for complex code</p>
                                        </div>
                                        {selectedModel === 'max' && canUseMax && (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#22c55e" strokeWidth="2">
                                                <path d="M3 8l3.5 3.5L13 5" />
                                            </svg>
                                        )}
                                        {!canUseMax && (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5">
                                                <rect x="4" y="7" width="8" height="7" rx="1.5" />
                                                <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                                <div className="border-t border-[#e5e5e5]" />
                                <div
                                    className="w-full text-left px-4 py-3 opacity-60 cursor-not-allowed"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-[#1a1a1a] whitespace-nowrap">
                                                🧩 Rocode Max Plugin
                                                <span className="ml-1.5 text-[10px] font-semibold text-[#f59e0b] bg-[#fef3c7] rounded-full px-1.5 py-0.5">COMING SOON</span>
                                            </p>
                                            <p className="text-xs text-[#999] mt-0.5">Code directly in Roblox Studio</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="p-1.5 rounded-lg hover:bg-[#f0f0f1] transition-colors cursor-pointer text-[#999] hover:text-[#1a1a1a]"
                        aria-label="Settings"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                    </button>
                </header>

                {/* Error banner */}
                {error && (
                    <div className="mx-4 md:mx-6 mt-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 animate-fadeIn flex justify-between items-center">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3 cursor-pointer">✕</button>
                    </div>
                )}

                {/* Messages */}
                <ChatMessages
                    messages={messages}
                    streamingContent={streamingContent}
                    isTyping={isTyping}
                    onSuggestion={handleSend}
                    stoppedMessageIndex={stoppedMessageIndex}
                />

                {/* Input */}
                <ChatInput
                    onSend={handleSend}
                    onStop={handleStop}
                    disabled={isStreaming || isTyping}
                    isStreaming={isStreaming}
                />
            </main>

            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                username={user}
                onPlanChange={fetchPlan}
            />
        </div>
    );
}
