'use client';

import Image from 'next/image';
import { formatMessage } from '@/lib/format';

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

export default function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
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
                    className="message-content"
                    dangerouslySetInnerHTML={{ __html: formatMessage(content) }}
                />
                {isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-current animate-blink ml-0.5 align-text-bottom" />
                )}
            </div>
        </div>
    );
}
