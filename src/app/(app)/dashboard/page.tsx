'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, PlusCircle, Store } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { VerificationBanner } from '@/components/dashboard/VerificationBanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

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
        
        <div>
          <h1 className="text-3xl font-bold font-headline">Welcome back, {profile.displayName}!</h1>
          <p className="text-muted-foreground mt-1">Here's a quick overview of your Intellectra Hub.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Your Stats Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Your Stats</CardTitle>
              <CardDescription>Keep track of your progress and contributions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center bg-secondary p-3 rounded-md">
                <span className="font-medium text-sm">Wallet Balance</span>
                <span className="font-bold text-sm text-primary">{profile.walletBalance.toFixed(2)} Coins</span>
              </div>
              <div className="flex justify-between items-center bg-secondary p-3 rounded-md">
                <span className="font-medium text-sm">Current Level</span>
                <span className="font-bold text-sm text-primary">Level {profile.level}</span>
              </div>
              <div className="flex justify-between items-center bg-secondary p-3 rounded-md">
                <span className="font-medium text-sm">Experience Points</span>
                <span className="font-bold text-sm text-primary">{profile.xp} XP</span>
              </div>
            </CardContent>
          </Card>

          {/* Get Started Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Jump right back into action.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button asChild size="lg">
                <Link href="/requests/new">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create a New Request
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/marketplace">
                  <Store className="mr-2 h-5 w-5" />
                  Browse Marketplace
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* How Leveling Works Card */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>How Leveling Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>Earn coins by solving requests in the marketplace.</p>
                <p>Every coin you earn also grants you 1 Experience Point (XP).</p>
                <p>Collect 100 XP to advance to the next level.</p>
                <p className="font-semibold text-foreground">Each time you level up, you'll receive a <span className="text-primary">300 Coin Bonus</span> in your wallet!</p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
