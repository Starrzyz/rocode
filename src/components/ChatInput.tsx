'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';

interface ChatInputProps {
    onSend: (text: string) => void;
    onStop?: () => void;
    disabled: boolean;
    isStreaming?: boolean;
}

export default function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const autoGrow = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    };

    useEffect(autoGrow, [value]);

    const handleSend = () => {
        const text = value.trim();
        if (!text || disabled) return;
        onSend(text);
        setValue('');
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="border-t border-[#e5e5e5] bg-white px-4 py-3 md:px-6">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-end gap-3 bg-[#f7f7f8] rounded-2xl border border-[#e5e5e5] px-4 py-2 focus-within:border-[#c5c5c5] transition-colors">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Ask Rocode anything about Roblox development..."
                        rows={1}
                        disabled={disabled || isStreaming}
                        className="flex-1 resize-none bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#999]
                       outline-none py-1.5 max-h-[150px] leading-relaxed disabled:opacity-50"
                    />
                    {isStreaming ? (
                        <button
                            onClick={onStop}
                            className="shrink-0 w-8 h-8 rounded-lg bg-[#ef4444] text-white flex items-center justify-center
                           hover:bg-[#dc2626] transition-all cursor-pointer animate-pulse"
                            aria-label="Stop generating"
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                <rect x="2" y="2" width="10" height="10" rx="2" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            onClick={handleSend}
                            disabled={disabled || !value.trim()}
                            className="shrink-0 w-8 h-8 rounded-lg bg-[#1a1a1a] text-white flex items-center justify-center
                           hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all cursor-pointer"
                            aria-label="Send message"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M2.5 1.75a.75.75 0 01 1.07-.67l10.5 5.25a.75.75 0 010 1.34l-10.5 5.25A.75.75 0 012.5 12.25V9.5l6-1.5-6-1.5V2.75z" />
                            </svg>
                        </button>
                    )}
                </div>
                <p className="text-[10px] text-[#bbb] text-center mt-2">
                    Rocode can make mistakes. Always verify generated code.
                </p>
            </div>
        </div>
    );
}
