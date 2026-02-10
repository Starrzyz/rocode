'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AuthContextType {
    user: string | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
    register: (username: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}

async function apiFetch(url: string, body?: object): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    try {
        const res = await fetch(url, {
            method: body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'same-origin',
        });
        const data = await res.json();
        return { ok: res.ok, data };
    } catch {
        return { ok: false, data: { error: 'Network error' } };
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Check session on mount
    useEffect(() => {
        apiFetch('/api/auth/me').then(({ data }) => {
            setUser((data.user as string) || null);
            setLoading(false);
        });
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const { ok, data } = await apiFetch('/api/auth/login', { username, password });
        if (ok) {
            setUser(data.username as string);
            return { ok: true };
        }
        return { ok: false, msg: (data.error as string) || 'Login failed.' };
    }, []);

    const register = useCallback(async (username: string, password: string) => {
        const { ok, data } = await apiFetch('/api/auth/register', { username, password });
        if (ok) {
            setUser(data.username as string);
            return { ok: true };
        }
        return { ok: false, msg: (data.error as string) || 'Registration failed.' };
    }, []);

    const logout = useCallback(async () => {
        await apiFetch('/api/auth/logout', {});
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
