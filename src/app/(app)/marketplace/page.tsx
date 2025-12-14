
"use client";

import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Request, RequestType } from '@/lib/types';
import { RequestCard } from '@/components/requests/RequestCard';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const requestTypes: RequestType[] = ['Project Material', 'Collaboration', 'Teaching Material', 'Others'];

export default function MarketplacePage() {
    const firestore = useFirestore();
    const [filter, setFilter] = useState<RequestType | 'All'>('All');
    const [sortedRequests, setSortedRequests] = useState<Request[]>([]);

    const requestsQuery = useMemoFirebase(() => {
        const requestsRef = collection(firestore, 'requests');
        let q = query(requestsRef, where('status', '==', 'Open'));

        if (filter !== 'All') {
            q = query(q, where('type', '==', filter));
        }
        
        return q;
    }, [firestore, filter]);

    const { data: requests, isLoading } = useCollection<Request>(requestsQuery);

    useEffect(() => {
        if(requests) {
            const sorted = [...requests].sort((a, b) => {
                const dateA = (a.createdAt as Timestamp)?.toMillis() || 0;
                const dateB = (b.createdAt as Timestamp)?.toMillis() || 0;
                return dateB - dateA;
            });
            setSortedRequests(sorted);
        }
    }, [requests]);

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

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : sortedRequests && sortedRequests.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h2 className="text-xl font-semibold">No Open Requests</h2>
                    <p className="text-muted-foreground mt-2">Check back later or try a different filter.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sortedRequests?.map((request) => (
                        <RequestCard key={request.id} request={request} />
                    ))}
                </div>
            )}
        </div>
    );
