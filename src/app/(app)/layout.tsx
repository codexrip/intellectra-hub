"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useIdle } from '@/hooks/useIdle';
import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  useIdle();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col sm:pl-16">
        <Header />
        <main className="flex-1 p-4 sm:p-6 pb-20 sm:pb-6">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
