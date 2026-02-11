'use client';

import { useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { formatMessage } from '@/lib/format';

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
    isStopped?: boolean;
}

export default function MessageBubble({ role, content, isStreaming, isStopped }: MessageBubbleProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    // Attach copy button click handlers after render (React doesn't bind inline onclick from innerHTML)
    const attachCopyHandlers = useCallback(() => {
        const el = contentRef.current;
        if (!el) return;

        const buttons = el.querySelectorAll<HTMLButtonElement>('.code-copy-btn[data-copy-target]');
        buttons.forEach((btn) => {
            // Skip if handler already attached
            if (btn.dataset.bound) return;
            btn.dataset.bound = 'true';

            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-copy-target');
                if (!targetId) return;
                const codeEl = document.getElementById(targetId);
                if (!codeEl) return;

                navigator.clipboard.writeText(codeEl.textContent || '').then(() => {
                    btn.textContent = '✓ Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = 'Copy';
                        btn.classList.remove('copied');
                    }, 2000);
                });
            });
        });
    }, []);

    useEffect(() => {
        attachCopyHandlers();
    });

    return (
        <div className={`flex gap-3 animate-fadeInUp ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {role === 'assistant' && (
                <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-[#f0f4ff] flex items-center justify-center mt-1">
                    <Image src="/IconBots.png" alt="Rocode" width={24} height={24} className="w-6 h-6 object-contain" />
                </div>
            )}
            <div
                className={`
          max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${role === 'user'
                        ? 'message-dark bg-[#1a1a1a] text-white rounded-br-md'
                        : 'bg-[#f0f0f1] text-[#1a1a1a] rounded-bl-md'}
        `}
            >
                <div
                    ref={contentRef}
                    className="message-content"
                    dangerouslySetInnerHTML={{ __html: formatMessage(content, isStreaming) }}
                />
                {isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-current animate-blink ml-0.5 align-text-bottom" />
                )}
                {isStopped && (
                    <div className="mt-2 pt-2 border-t border-[#e0e0e0] flex items-center gap-1.5 text-[11px] text-[#999] italic">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="6" height="6" rx="1" />
                        </svg>
                        Response stopped
                    </div>
                )}
            </div>
        </div>
    );
}
