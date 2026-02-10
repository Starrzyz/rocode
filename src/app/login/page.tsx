'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const { user, loading, login, register } = useAuth();
    const router = useRouter();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            router.replace('/chat');
        }
    }, [user, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);

        const result = isRegister
            ? await register(username, password)
            : await login(username, password);

        setSubmitting(false);
        if (result.ok) {
            setSuccess(isRegister ? 'Account created!' : 'Welcome back!');
            setTimeout(() => router.replace('/chat'), 300);
        } else {
            setError(result.msg || 'Something went wrong.');
        }
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        setError('');
        setSuccess('');
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="w-full max-w-sm animate-fadeIn">
                {/* Logo */}
                <div className="flex justify-center mb-10">
                    <Image src="/Icon.svg" alt="Rocode" width={160} height={44} className="h-10 w-auto" priority />
                </div>

                {/* Card */}
                <div className="bg-white border border-[#e5e5e5] rounded-2xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
                    <h1 className="text-xl font-semibold text-center text-[#1a1a1a] mb-1">
                        {isRegister ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p className="text-sm text-[#999] text-center mb-6">
                        {isRegister ? 'Sign up to start coding with Rocode' : 'Sign in to continue coding'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-xs font-medium text-[#6b6b6b] mb-1.5">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-[#f7f7f8]
                           text-sm text-[#1a1a1a] placeholder:text-[#bbb]
                           focus:outline-none focus:border-[#c5c5c5] focus:bg-white transition-all"
                                placeholder="Enter username"
                                autoComplete="username"
                                disabled={submitting}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-[#6b6b6b] mb-1.5">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-[#f7f7f8]
                           text-sm text-[#1a1a1a] placeholder:text-[#bbb]
                           focus:outline-none focus:border-[#c5c5c5] focus:bg-white transition-all"
                                placeholder="Enter password"
                                autoComplete={isRegister ? 'new-password' : 'current-password'}
                                disabled={submitting}
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 animate-fadeIn">{error}</p>
                        )}
                        {success && (
                            <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 animate-fadeIn">{success}</p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-10 bg-[#1a1a1a] text-white rounded-lg text-sm font-medium
                         hover:bg-[#333] active:scale-[0.98] transition-all cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <button
                            onClick={toggleMode}
                            className="text-xs text-[#999] hover:text-[#1a1a1a] transition-colors cursor-pointer"
                            disabled={submitting}
                        >
                            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
