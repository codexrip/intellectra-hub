'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { useAuth } from '@/firebase';

export function WalletCard({ profile }: { profile: UserProfile }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState<'buy' | 'withdraw' | null>(null);

  const isVerified = !!auth.currentUser?.emailVerified;

  const handleBuyTokens = async () => {
    if (!profile) return;
    setLoading('buy');
    
    // Mock 2-second processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const userDocRef = doc(firestore, 'users', profile.uid);
      await updateDoc(userDocRef, {
        walletBalance: increment(100),
      });
      toast({
        title: 'Success!',
        description: '100 coins have been added to your wallet.',
      });
    } catch (error) {
      console.error('Error buying tokens:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add coins to your wallet.',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleWithdraw = async () => {
    if (!profile) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a positive number.' });
      return;
    }
    if (amount > profile.walletBalance) {
      toast({ variant: 'destructive', title: 'Insufficient Funds', description: "You can't withdraw more than you have." });
      return;
    }

    setLoading('withdraw');
    try {
      const userDocRef = doc(firestore, 'users', profile.uid);
      await updateDoc(userDocRef, {
        walletBalance: increment(-amount),
      });
      toast({
        title: 'Withdrawal Successful',
        description: `${amount} coins have been withdrawn.`,
      });
      setWithdrawAmount('');
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to withdraw funds.',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Wallet</CardTitle>
        <CardDescription>Manage your virtual currency.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-6 bg-secondary rounded-lg">
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-5xl font-bold font-headline">{profile.walletBalance.toFixed(2)}</p>
          <p className="text-lg text-muted-foreground">Coins</p>
        </div>
        <Button size="lg" className="w-full" onClick={handleBuyTokens} disabled={!isVerified || !!loading}>
          {loading === 'buy' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading === 'buy' ? 'Processing Payment...' : 'Buy 100 Tokens'}
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <div className="flex w-full gap-2">
          <Input 
            placeholder="Amount" 
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            disabled={!isVerified || !!loading}
          />
          <Button variant="outline" onClick={handleWithdraw} disabled={!isVerified || !!loading}>
            {loading === 'withdraw' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Withdraw
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
