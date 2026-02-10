'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/chat' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="w-6 h-6 border-2 border-[#e5e5e5] border-t-[#1a1a1a] rounded-full animate-spin" />
    </div>
  );
}
