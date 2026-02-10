'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsModal from '@/components/SettingsModal';
import type { Chat, Message } from '@/lib/chat';

// Chat list item (without messages, as returned by GET /api/chats)
interface ChatListItem {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

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

    const streamAbortRef = useRef<AbortController | null>(null);

    // Auth guard
    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    // Load chat list on mount
    useEffect(() => {
        if (user) refreshChatList();
    }, [user]);

    const refreshChatList = useCallback(async () => {
        try {
            const res = await fetch('/api/chats', { credentials: 'same-origin' });
            if (res.ok) {
                const data = await res.json();
                setChatList(data.chats || []);
            }
        } catch {
            // Silently fail on list refresh
        }
    }, []);

    // Load messages when active chat changes
    useEffect(() => {
        if (!activeChatId) {
            setMessages([]);
            return;
        }
        loadChatMessages(activeChatId);
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
                await refreshChatList();
            }
        } catch {
            // fail silently
        }
        setSidebarOpen(false);
    }, [refreshChatList]);

    const handleSelectChat = useCallback((id: string) => {
        setActiveChatId(id);
        setError(null);
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
                }
                await refreshChatList();
            } catch {
                // fail silently
            }
        },
        [activeChatId, refreshChatList],
    );

    const handleLogout = useCallback(async () => {
        await logout();
        router.replace('/login');
    }, [logout, router]);

    // Send message and stream AI response
    const handleSend = useCallback(
        async (text: string) => {
            setError(null);
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
                } catch {
                    setError('Failed to create chat.');
                    return;
                }
            }

            // Optimistic: show user message immediately
            const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
            setMessages((prev) => [...prev, userMsg]);
            setIsTyping(true);

            // Start streaming request
            const abortController = new AbortController();
            streamAbortRef.current = abortController;

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId, message: text }),
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
                let fullContent = '';

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
                                fullContent += parsed.content;
                                setStreamingContent(fullContent);
                            }
                        } catch {
                            // Skip malformed chunks
                        }
                    }
                }

                // Finalize: add assistant message to local state
                if (fullContent.trim()) {
                    setMessages((prev) => [
                        ...prev,
                        { role: 'assistant', content: fullContent, timestamp: Date.now() },
                    ]);
                }
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    setError('Connection failed. Please try again.');
                }
            } finally {
                setStreamingContent(null);
                setIsStreaming(false);
                setIsTyping(false);
                streamAbortRef.current = null;
                refreshChatList();
            }
        },
        [activeChatId, refreshChatList],
    );

    if (loading || !user) return null;

    // Map chatList to the format Sidebar expects
    const sidebarChats = chatList.map((c) => ({
        ...c,
        user: user,
        messages: [],
    }));

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
                        <button
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-600 ml-3 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Messages */}
                <ChatMessages
                    messages={messages}
                    streamingContent={streamingContent}
                    isTyping={isTyping}
                    onSuggestion={handleSend}
                />

                {/* Input */}
                <ChatInput onSend={handleSend} disabled={isStreaming || isTyping} />
            </main>

            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                username={user}
            />
        </div>
    );
}
