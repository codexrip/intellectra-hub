'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { VerificationBanner } from '@/components/dashboard/VerificationBanner';
import { ProfileForm } from '@/components/dashboard/ProfileForm';
import { WalletCard } from '@/components/dashboard/WalletCard';
import { AccountDangerZone } from '@/components/dashboard/AccountDangerZone';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  if (isUserLoading || isProfileLoading || !profile || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-0">
      <div className="space-y-6">
        <VerificationBanner user={user} />
        
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProfileForm profile={profile} />
            <AccountDangerZone />
          </div>
          <div className="lg:col-span-1">
            <WalletCard profile={profile} />
          </div>
        </div>
      </div>
    </div>
  );
}
