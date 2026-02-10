// Shared chat types — used by both backend (db.ts) and frontend

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface Chat {
    id: string;
    user: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}
