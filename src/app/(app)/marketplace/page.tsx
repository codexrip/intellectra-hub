"use client";

import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { Request, RequestType } from '@/lib/types';
import { RequestCard } from '@/components/requests/RequestCard';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const requestTypes: RequestType[] = ['Project Material', 'Collaboration', 'Teaching Material', 'Others'];

export default function MarketplacePage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<RequestType | 'All'>('All');

    useEffect(() => {
        setLoading(true);
        const requestsRef = collection(db, 'requests');
        let q;

        if (filter === 'All') {
            q = query(
                requestsRef,
                where('status', '==', 'Open'),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(
                requestsRef,
                where('status', '==', 'Open'),
                where('type', '==', filter),
                orderBy('createdAt', 'desc')
            );
        }

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const openRequests: Request[] = [];
            querySnapshot.forEach((doc) => {
                openRequests.push({ id: doc.id, ...doc.data() } as Request);
            });
            setRequests(openRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching requests:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filter]);

    return (
        <div className="container mx-auto p-0">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold font-headline">Marketplace</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Filter by type:</span>
                    <Select onValueChange={(value: RequestType | 'All') => setFilter(value)} defaultValue="All">
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Types</SelectItem>
                            {requestTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h2 className="text-xl font-semibold">No Open Requests</h2>
                    <p className="text-muted-foreground mt-2">Check back later or try a different filter.</p>
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
