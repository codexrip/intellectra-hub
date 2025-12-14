"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useDoc } from "@/firebase";
import { UserProfile } from "@/lib/types";
import { ArrowRight, PlusCircle, Store } from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: profile, isLoading } = useDoc<UserProfile>(userProfileRef);

    if (isLoading || !profile) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-0">
            <div className="space-y-6">
                <div className="bg-card p-6 rounded-lg shadow-sm">
                    <h1 className="font-headline text-3xl md:text-4xl font-bold">Welcome back, {profile?.displayName}!</h1>
                    <p className="text-muted-foreground mt-2">Here's a quick overview of your Intellectra Hub.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Stats</CardTitle>
                            <CardDescription>Keep track of your progress and contributions.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-secondary rounded-md">
                                <span className="font-medium">Wallet Balance</span>
                                <span className="font-bold text-primary">{profile?.walletBalance.toFixed(2)} Coins</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-secondary rounded-md">
                                <span className="font-medium">Current Level</span>
                                <span className="font-bold text-primary">Level {profile?.level}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-secondary rounded-md">
                                <span className="font-medium">Experience Points</span>
                                <span className="font-bold text-primary">{profile?.xp} XP</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Get Started</CardTitle>
                            <CardDescription>Jump right back into action.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-center space-y-4">
                            <Button asChild size="lg" className="w-full">
                                <Link href="/requests/new">
                                    <PlusCircle className="mr-2 h-5 w-5" />
                                    Create a New Request
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="w-full">
                                <Link href="/marketplace">
                                    <Store className="mr-2 h-5 w-5" />
                                    Browse Marketplace
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                    
                    <Card className="md:col-span-2 lg:col-span-1">
                        <CardHeader>
                            <CardTitle>How Leveling Works</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <p>Earn coins by solving requests in the marketplace.</p>
                            <p>Every coin you earn also grants you 1 Experience Point (XP).</p>
                            <p>Collect 100 XP to advance to the next level.</p>
                            <p className="font-bold text-foreground">Each time you level up, you'll receive a <span className="text-primary">300 Coin Bonus</span> in your wallet!</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
