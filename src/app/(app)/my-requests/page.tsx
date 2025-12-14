"use client";

import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Request } from '@/lib/types';
import { RequestCard } from '@/components/requests/RequestCard';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function MyRequestsPage() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        setLoading(true);
        const requestsRef = collection(db, 'requests');
        const q = query(
            requestsRef,
            where('requesterId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userRequests: Request[] = [];
            querySnapshot.forEach((doc) => {
                userRequests.push({ id: doc.id, ...doc.data() } as Request);
            });
            setRequests(userRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user requests:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-headline">My Requests</h1>
                <Button asChild>
                    <Link href="/requests/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Request
                    </Link>
                </Button>
            </div>
            
            {requests.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h2 className="text-xl font-semibold">No Requests Found</h2>
                    <p className="text-muted-foreground mt-2">You haven't created any requests yet.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {requests.map((request) => (
                        <RequestCard key={request.id} request={request} />
                    ))}
                </div>
            )}
        </div>
    );
}
