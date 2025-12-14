"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { Coins, PlusCircle, MinusCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { UserProfile } from "@/lib/types";

export default function WalletPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState<"buy" | "withdraw" | null>(null);

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const { data: profile } = useDoc<UserProfile>(userProfileRef);


    const handleBuyTokens = async () => {
        if (!user) return;
        setLoading("buy");
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
                walletBalance: increment(100)
            });
            toast({
                title: "Success!",
                description: "100 coins have been added to your wallet.",
            });
        } catch (error) {
            console.error("Error buying tokens:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to add coins to your wallet.",
            });
        } finally {
            setLoading(null);
        }
    };
    
    const handleWithdraw = async () => {
        if (!user || !profile) return;
        setLoading("withdraw");
        const amountToWithdraw = 50;
        if (profile.walletBalance < amountToWithdraw) {
            toast({
                variant: "destructive",
                title: "Insufficient Funds",
                description: "You don't have enough coins to withdraw.",
            });
            setLoading(null);
            return;
        }

        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
                walletBalance: increment(-amountToWithdraw)
            });
            toast({
                title: "Withdrawal Successful",
                description: `${amountToWithdraw} coins have been withdrawn (mock).`,
            });
        } catch (error) {
            console.error("Error withdrawing coins:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to withdraw coins.",
            });
        } finally {
            setLoading(null);
        }
    }

    if (!profile) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-0">
            <h1 className="text-3xl font-bold font-headline mb-6">My Wallet</h1>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Manage Your Coins</CardTitle>
                    <CardDescription>View your balance and manage your virtual currency.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col items-center justify-center p-8 bg-secondary rounded-lg">
                        <Coins className="h-16 w-16 text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className="text-5xl font-bold font-headline tracking-tighter">{profile?.walletBalance.toFixed(2)}</p>
                        <p className="text-lg text-muted-foreground">Coins</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button size="lg" onClick={handleBuyTokens} disabled={!!loading}>
                            {loading === 'buy' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-5 w-5" />}
                            Buy 100 Tokens
                        </Button>
                        <Button size="lg" variant="outline" onClick={handleWithdraw} disabled={!!loading}>
                            {loading === 'withdraw' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MinusCircle className="mr-2 h-5 w-5" />}
                            Withdraw 50 Tokens
                        </Button>
                    </div>
                     <p className="text-xs text-center text-muted-foreground pt-4">Note: These are mock transactions for demonstration purposes.</p>
                </CardContent>
            </Card>
        </div>
    );
}
