
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  collection,
  query,
  where,
  addDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  increment,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Request, Solution, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Coins, Zap, Trash2, Send, CheckCircle, Star } from 'lucide-react';
import { REWARD_PERCENTAGE, LEVEL_UP_BONUS, XP_PER_LEVEL } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"

// --- FORMS & DIALOGS ---

function SolutionForm({ onSubmit, disabled }: { onSubmit: (content: string, link: string) => Promise<void>, disabled: boolean }) {
    const [content, setContent] = useState('');
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);
        await onSubmit(content, link);
        setContent('');
        setLink('');
        setLoading(false);
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Submit Your Solution</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea
                        placeholder="Describe your solution or answer here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={6}
                        required
                        disabled={disabled}
                    />
                    <Input 
                        placeholder="Link to file/resource (optional)"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        disabled={disabled}
                    />
                    <Button type="submit" disabled={loading || !content.trim() || disabled}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                        Submit Solution
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

// --- MAIN PAGE COMPONENT ---

export default function RequestDetailPage() {
    const { id } = useParams();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const requestId = Array.isArray(id) ? id[0] : id;

    // --- DATA FETCHING ---
    
    const requestDocRef = useMemoFirebase(() => {
        if (!requestId || !firestore) return null;
        return doc(firestore, 'requests', requestId);
    }, [requestId, firestore]);
    
    const { data: request, isLoading: isRequestLoading } = useDoc<Request>(requestDocRef);

    const solutionsQuery = useMemoFirebase(() => {
        if (!requestId || !firestore) return null;
        return query(collection(firestore, 'solutions'), where('requestId', '==', requestId), orderBy('createdAt', 'desc'));
    }, [requestId, firestore]);

    const { data: solutions, isLoading: areSolutionsLoading } = useCollection<Solution>(solutionsQuery);
    
    // --- STATE & DERIVED VALUES ---

    const isOwner = user?.uid === request?.requesterId;
    const isWorker = !isUserLoading && user && !isOwner;
    const isEmailVerified = !!user?.emailVerified;

    const rewardAmount = request ? Math.round(request.cost * REWARD_PERCENTAGE) : 0;


    // --- HANDLERS ---

    const handleSolutionSubmit = async (content: string, link: string) => {
        if (!user || !request) return;

        try {
            await addDoc(collection(firestore, 'solutions'), {
                requestId: request.id,
                solverId: user.uid,
                solverName: user.displayName || 'Anonymous Solver',
                content,
                link,
                status: 'Pending',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Solution Submitted!', description: 'Your solution has been posted for the requester to review.' });
        } catch (error) {
            console.error("Error submitting solution:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit solution.' });
        }
    };
    
    const handleDeleteRequest = async () => {
        if (!requestDocRef) return;
        try {
            await deleteDoc(requestDocRef);
            toast({ title: 'Request Deleted', description: 'Your request has been removed.' });
            router.push('/my-requests');
        } catch (error) {
            console.error("Error deleting request:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete request.' });
        }
    };

    const renderActionZone = () => {
        if (isUserLoading) {
            return <Card><CardHeader><Loader2 className="h-5 w-5 animate-spin" /></CardHeader></Card>;
        }

        if (isOwner) {
            return (
                <Card>
                   <CardHeader>
                        <CardTitle>This is your request.</CardTitle>
                        <CardDescription>Solutions submitted by other users will appear below. You can then review them and accept the best one.</CardDescription>
                    </CardHeader>
                    {request?.status === 'Open' && (
                        <CardFooter>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Request</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete your request.</AlertDialogDescription>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteRequest}>Continue</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    )}
                </Card>
            );
        }

        if (isWorker) {
            if (request?.status !== 'Open') {
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Request Closed</CardTitle>
                            <CardDescription>This request is no longer accepting solutions.</CardDescription>
                        </CardHeader>
                    </Card>
                );
            }
            if (!isEmailVerified) {
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Verify Your Email</CardTitle>
                            <CardDescription>Please verify your email to submit solutions.</CardDescription>
                        </CardHeader>
                    </Card>
                )
            }
             return <SolutionForm onSubmit={handleSolutionSubmit} disabled={!isEmailVerified} />;
        }
        
        return null; // Should not happen for logged-in users
    }


    // --- RENDER ---

    if (isRequestLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!request) {
        return <div className="text-center py-10"><h2>Request not found</h2></div>;
    }

    return (
        <div className="container mx-auto p-0 space-y-8">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                <div>
                                    <Badge variant="secondary">{request.type}</Badge>
                                    <CardTitle className="mt-2 text-3xl font-headline">{request.title}</CardTitle>
                                    <CardDescription className="mt-1">
                                        Posted {request.createdAt ? formatDistanceToNow(new Date((request.createdAt as unknown as Timestamp).seconds * 1000), { addSuffix: true }) : ''} by {request.requesterName}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Badge className="text-sm"><Zap className="h-3 w-3 mr-1"/>{request.urgency}</Badge>
                                        <Badge variant={request.status === 'Open' ? 'default' : 'destructive'} className="text-sm">{request.status}</Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-lg font-bold text-green-600">
                                        <Coins className="h-5 w-5" />
                                        <span>Earn {rewardAmount} Coins</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-base whitespace-pre-wrap">{request.description}</p>
                        </CardContent>
                    </Card>
                </div>
                
                {/* --- Action Zone --- */}
                <div className="space-y-6">
                    {renderActionZone()}
                </div>
            </div>

            {/* --- Solutions Section --- */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-headline">Solutions ({solutions?.length || 0})</h2>
                {areSolutionsLoading ? (
                     <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : solutions && solutions.length > 0 ? (
                    solutions.map(solution => (
                        <Card key={solution.id} className={solution.status === 'Accepted' ? "border-primary bg-primary/5" : ""}>
                            <CardHeader className="flex flex-row justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={(solution as any).solverProfile?.photoURL} />
                                        <AvatarFallback>{solution.solverName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{solution.solverName}</p>
                                        <p className="text-xs text-muted-foreground">{solution.createdAt ? formatDistanceToNow(new Date((solution.createdAt as Timestamp).seconds * 1000), { addSuffix: true }) : ''}</p>
                                    </div>
                                </div>
                                {solution.status === 'Accepted' && <Badge className="bg-green-500 text-white"><CheckCircle className="mr-2 h-4 w-4"/>Accepted</Badge>}
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="whitespace-pre-wrap">{solution.content}</p>
                                {solution.link && <a href={solution.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View Attached Link</a>}
                            </CardContent>
                             {isOwner && request.status === 'Open' && (
                                <CardFooter>
                                    <Button onClick={() => {
                                        // Placeholder for next step's logic
                                        toast({title: 'Coming Soon!', description: 'Accepting solutions will be implemented next.'})
                                    }}>
                                        <CheckCircle className="mr-2 h-4 w-4"/>Accept Solution
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-8">No solutions have been submitted yet.</p>
                )}
            </div>

        </div>
    );
}

