"use client";

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { IDLE_TIMEOUT } from '@/lib/constants';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';

export function useIdle() {
  const [isIdle, setIsIdle] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const router = useRouter();

  const handleIdle = useCallback(() => {
    setIsIdle(true);
    toast({
        title: "You've been logged out",
        description: "You have been logged out due to inactivity.",
        variant: "destructive"
    });
    signOut(auth).then(() => {
        router.push('/login');
    }).catch(error => {
      console.error("Error signing out:", error);
    });
  }, [toast, auth, router]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    const resetTimer = () => {
      if (isIdle) {
        setIsIdle(false);
      }
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleIdle, IDLE_TIMEOUT);
    };

    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [handleIdle, isIdle]);

  return isIdle;
}
