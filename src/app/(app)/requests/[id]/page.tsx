"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  collection,
  query,
  onSnapshot,
  orderBy,
  runTransaction,
  serverTimestamp,
  deleteDoc,
  writeBatch,
  increment,
  addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Request, Solution, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Coins, Zap, Edit, Trash2, Send, CheckCircle } from 'lucide-radix';
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

function SolutionForm({ requestId }: { requestId: string }) {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile || !content.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'solutions'), {
                requestId,
                solverId: user.uid,
                content,
                isAccepted: false,
                createdAt: serverTimestamp(),
            });
            setContent('');
            toast({ title: 'Solution Submitted', description: 'Your solution has been posted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit solution.' });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Submit Your Solution</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea
                        placeholder="Provide your detailed solution here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={6}
                    />
                    <Button type="submit" disabled={loading || !content.trim()}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                        Submit Solution
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function RequestDetailPage() {
    const { id } = useParams();
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [request, setRequest] = useState<Request | null>(null);
    const [solutions, setSolutions] = useState<Solution[]>([]);
    const [loading, setLoading] = useState(true);

    const requestId = Array.isArray(id) ? id[0] : id;

    useEffect(() => {
        if (!requestId) return;

        const requestDocRef = doc(db, 'requests', requestId);
        const unsubscribeRequest = onSnapshot(requestDocRef, (doc) => {
            if (doc.exists()) {
                setRequest({ id: doc.id, ...doc.data() } as Request);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Request not found.' });
                router.push('/marketplace');
            }
            setLoading(false);
        });

        const solutionsQuery = query(collection(db, 'solutions'), where('requestId', '==', requestId), orderBy('createdAt', 'desc'));
        const unsubscribeSolutions = onSnapshot(solutionsQuery, async (snapshot) => {
            const solutionsData: Solution[] = [];
            for (const doc of snapshot.docs) {
                const solution = { id: doc.id, ...doc.data() } as Solution;
                const solverDoc = await getDoc(doc(db, 'users', solution.solverId));
                if(solverDoc.exists()){
                    const solverProfile = solverDoc.data() as UserProfile;
                    solution.solver = {
                        displayName: solverProfile.displayName,
                        photoURL: solverProfile.photoURL,
                    }
                }
                solutionsData.push(solution);
            }
            setSolutions(solutionsData);
        });

        return () => {
            unsubscribeRequest();
            unsubscribeSolutions();
        };
    }, [requestId, router, toast]);

    const isOwner = user?.uid === request?.requesterId;

    const handleMarkAsCompleted = async (solution: Solution) => {
        if (!request || !user) return;
    
        try {
            await runTransaction(db, async (transaction) => {
                const requestRef = doc(db, 'requests', request.id);
                const solverRef = doc(db, 'users', solution.solverId);
                const solutionRef = doc(db, 'solutions', solution.id);
                
                const solverDoc = await transaction.get(solverRef);
                if (!solverDoc.exists()) throw new Error("Solver not found");
                
                const solverProfile = solverDoc.data() as UserProfile;
                const reward = Math.round(request.cost * REWARD_PERCENTAGE);
                const newXp = solverProfile.xp + reward;
                const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
                
                let walletUpdate = reward;
                if (newLevel > solverProfile.level) {
                    walletUpdate += LEVEL_UP_BONUS;
                }
    
                transaction.update(requestRef, { status: 'Completed' });
                transaction.update(solutionRef, { isAccepted: true });
                transaction.update(solverRef, {
                    walletBalance: increment(walletUpdate),
                    xp: increment(reward),
                    level: newLevel
                });
            });
    
            toast({ title: 'Request Completed!', description: `Reward of ${Math.round(request.cost * REWARD_PERCENTAGE)} coins sent to the solver.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete request.' });
        }
    };
    
    const handleDeleteRequest = async () => {
        if (!request) return;
        try {
            await deleteDoc(doc(db, 'requests', request.id));
            toast({ title: 'Request Deleted', description: 'Your request has been removed.' });
            router.push('/my-requests');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete request.' });
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!request) return null;

    const rewardAmount = Math.round(request.cost * REWARD_PERCENTAGE);

    return (
        <div className="container mx-auto p-0 space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <Badge variant="secondary">{request.type}</Badge>
                            <CardTitle className="mt-2 text-3xl font-headline">{request.title}</CardTitle>
                            <CardDescription className="mt-1">
                                Posted {request.createdAt ? formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true }) : ''}
                            </CardDescription>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                           <div className="flex items-center gap-2">
                            <Badge className="text-sm"><Zap className="h-3 w-3 mr-1"/>{request.urgency}</Badge>
                            <Badge variant={request.status === 'Open' ? 'default' : 'destructive'} className="text-sm">{request.status}</Badge>
                           </div>
                           <div className="flex items-center gap-1 text-lg font-bold text-primary">
                                <Coins className="h-5 w-5" />
                                <span>{rewardAmount} Coin Reward</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-base whitespace-pre-wrap">{request.description}</p>
                </CardContent>
                {isOwner && request.status === 'Open' && (
                    <CardFooter className="flex gap-2">
                        {solutions.length === 0 && (
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
                        )}
                    </CardFooter>
                )}
            </Card>

            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-headline">Solutions ({solutions.length})</h2>
                {solutions.length > 0 ? (
                    solutions.map(solution => (
                        <Card key={solution.id} className={solution.isAccepted ? "border-primary bg-primary/5" : ""}>
                            <CardHeader className="flex flex-row justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={solution.solver?.photoURL} />
                                        <AvatarFallback>{solution.solver?.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{solution.solver?.displayName}</p>
                                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(solution.createdAt.toDate(), { addSuffix: true })}</p>
                                    </div>
                                </div>
                                {solution.isAccepted && <Badge className="bg-green-500 text-white"><CheckCircle className="mr-2 h-4 w-4"/>Accepted</Badge>}
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap">{solution.content}</p>
                            </CardContent>
                            {isOwner && request.status === 'Open' && (
                                <CardFooter>
                                    <Button onClick={() => handleMarkAsCompleted(solution)}><CheckCircle className="mr-2 h-4 w-4"/>Mark as Completed</Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-8">No solutions have been submitted yet.</p>
                )}
            </div>

            {!isOwner && request.status === 'Open' && !solutions.some(s => s.solverId === user?.uid) && (
                <SolutionForm requestId={requestId} />
            )}
        </div>
    );
}
