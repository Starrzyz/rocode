'use client';

export default function TypingIndicator() {
    return (
        <div className="flex gap-3 animate-fadeInUp">
            <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-[#f0f4ff] flex items-center justify-center mt-1">
                <img src="/IconBots.png" alt="Rocode" className="w-6 h-6 object-contain" />
            </div>
            <div className="bg-[#f0f0f1] rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#999] animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-[#999] animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-[#999] animate-bounce [animation-delay:300ms]" />
            </div>
        </div>
    );
}
