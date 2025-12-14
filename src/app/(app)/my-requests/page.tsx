
"use client";

import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { Request } from '@/lib/types';
import { RequestCard } from '@/components/requests/RequestCard';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function MyRequestsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userRequestsQuery = useMemoFirebase(() => {
        if (!user) return null;
        // Corrected: Query the top-level 'requests' collection
        const requestsRef = collection(firestore, 'requests');
        return query(
            requestsRef,
            where('requesterId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, user]);

    const { data: requests, isLoading } = useCollection<Request>(userRequestsQuery);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-0">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold font-headline self-start sm:self-center">My Requests</h1>
                <Button asChild className="w-full sm:w-auto">
                    <Link href="/requests/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Request
                    </Link>
                </Button>
            </div>
            
            {requests && requests.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h2 className="text-xl font-semibold">No Requests Found</h2>
                    <p className="text-muted-foreground mt-2">You haven't created any requests yet.</p>
                    <Button asChild className="mt-4">
                        <Link href="/requests/new">Create Your First Request</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {requests?.map((request) => (
                        <RequestCard key={request.id} request={request} />
                    ))}
                </div>
            )}
        </div>
    );
}
