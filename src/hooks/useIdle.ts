"use client";

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { IDLE_TIMEOUT } from '@/lib/constants';
import { useToast } from './use-toast';

export function useIdle() {
  const [isIdle, setIsIdle] = useState(false);
  const { toast } = useToast();

  const handleIdle = useCallback(() => {
    setIsIdle(true);
    toast({
        title: "You've been idle",
        description: "You will be logged out for inactivity.",
        variant: "destructive"
    });
    signOut(auth).catch(error => {
      console.error("Error signing out:", error);
    });
  }, [toast]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

    const resetTimer = () => {
      if (isIdle) {
        setIsIdle(false);
      }
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleIdle, IDLE_TIMEOUT);
    };

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
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
