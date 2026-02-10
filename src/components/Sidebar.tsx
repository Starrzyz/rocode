'use client';

import Image from 'next/image';
import { type Chat } from '@/lib/chat';

interface SidebarProps {
    chats: Chat[];
    activeChatId: string | null;
    onNewChat: () => void;
    onSelectChat: (id: string) => void;
    onDeleteChat: (id: string) => void;
    onLogout: () => void;
    username: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({
    chats,
    activeChatId,
    onNewChat,
    onSelectChat,
    onDeleteChat,
    onLogout,
    username,
    isOpen,
    onClose,
}: SidebarProps) {
    const formatDate = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={onClose} />
            )}

            <aside
                className={`
          fixed md:relative z-50 h-full w-72
          bg-[#f7f7f8] border-r border-[#e5e5e5]
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-[#e5e5e5]">
                    <Image src="/Icon.svg" alt="Rocode" width={110} height={30} className="h-7 w-auto" />
                </div>

                {/* New Chat Button */}
                <div className="px-3 pt-4 pb-2">
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4
                       bg-[#1a1a1a] text-white rounded-lg text-sm font-medium
                       hover:bg-[#333] transition-colors cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="8" y1="2" x2="8" y2="14" />
                            <line x1="2" y1="8" x2="14" y2="8" />
                        </svg>
                        New Chat
                    </button>
                </div>

                {/* Chat list */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
                    {chats.length === 0 && (
                        <p className="text-xs text-[#999] text-center py-8">No conversations yet</p>
                    )}
                    {chats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            className={`
                group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer
                transition-colors text-sm
                ${chat.id === activeChatId
                                    ? 'bg-white shadow-sm border border-[#e5e5e5] text-[#1a1a1a]'
                                    : 'text-[#6b6b6b] hover:bg-white/60'}
              `}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{chat.title}</p>
                                <p className="text-xs text-[#999] mt-0.5">{formatDate(chat.updatedAt)}</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteChat(chat.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 shrink-0 ml-2 p-1 rounded
                           hover:bg-[#e5e5e5] transition-all text-[#999] hover:text-red-500 cursor-pointer"
                                aria-label="Delete chat"
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M2 4h10M5 4V2.5A.5.5 0 015.5 2h3a.5.5 0 01.5.5V4M11 4v7.5a1 1 0 01-1 1H4a1 1 0 01-1-1V4" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </nav>

                {/* User info */}
                <div className="border-t border-[#e5e5e5] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-semibold uppercase">
                            {username.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-[#1a1a1a] truncate max-w-[120px]">{username}</span>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-lg hover:bg-[#e5e5e5] transition-colors text-[#999] hover:text-[#1a1a1a] cursor-pointer"
                        aria-label="Logout"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M6.75 15.75H3.75a1.5 1.5 0 01-1.5-1.5v-10.5a1.5 1.5 0 011.5-1.5h3M12 12.75L15.75 9 12 5.25M7.5 9h8.25" />
                        </svg>
                    </button>
                </div>
            </aside>
        </>
    );
}
