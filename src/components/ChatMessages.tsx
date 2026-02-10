'use client';

import { useRef, useEffect } from 'react';
import { type Message } from '@/lib/chat';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface ChatMessagesProps {
    messages: Message[];
    streamingContent: string | null;
    isTyping: boolean;
    onSuggestion: (text: string) => void;
}

const suggestions = [
    'How do I make a kill brick?',
    'Explain RemoteEvents vs RemoteFunctions',
    'Create a leaderstats system',
    'How to use TweenService?',
];

export default function ChatMessages({ messages, streamingContent, isTyping, onSuggestion }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent, isTyping]);

    const isEmpty = messages.length === 0 && !streamingContent && !isTyping;

    return (
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 scrollbar-thin">
            <div className="max-w-3xl mx-auto space-y-6">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-[#f0f4ff] flex items-center justify-center mb-6">
                            <img src="/IconBots.png" alt="Rocode" className="w-10 h-10 object-contain" />
                        </div>
                        <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-2">How can I help you?</h2>
                        <p className="text-sm text-[#999] mb-8">Ask me anything about Roblox Luau development</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => onSuggestion(s)}
                                    className="text-left px-4 py-3 rounded-xl border border-[#e5e5e5] text-sm text-[#6b6b6b]
                             hover:bg-[#f7f7f8] hover:border-[#d0d0d0] transition-all cursor-pointer"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <MessageBubble key={i} role={msg.role} content={msg.content} />
                        ))}
                        {isTyping && !streamingContent && <TypingIndicator />}
                        {streamingContent && (
                            <MessageBubble role="assistant" content={streamingContent} isStreaming />
                        )}
                    </>
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
