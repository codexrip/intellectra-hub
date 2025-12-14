'use client';

import { useAuth } from '@/firebase';
import { sendEmailVerification, type User } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Terminal } from 'lucide-react';
import { useState } from 'react';

export function VerificationBanner({ user }: { user: User }) {
  const auth = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox (and spam folder) to verify your account.',
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send verification email. Please try again later.',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (user.emailVerified) {
    return null;
  }

  return (
    <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-800 dark:text-yellow-200">
      <Terminal className="h-4 w-4 !text-yellow-600" />
      <AlertTitle className="font-bold">Verify Your Email</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p>Your email is not verified. Some features are locked until you verify your account.</p>
        <Button
          onClick={handleResendVerification}
          disabled={isSending}
          variant="outline"
          className="bg-yellow-100 text-yellow-900 hover:bg-yellow-200 border-yellow-300 w-full sm:w-auto"
        >
          {isSending ? 'Sending...' : 'Resend Verification Email'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
