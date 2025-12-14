
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
  where,
  increment,
  addDoc,
  getDocs,
  collectionGroup,
  DocumentReference
} from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Request, Solution, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

function FeedbackModal({ open, onOpenChange, onSubmit, solverName }: { open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (rating: number) => void, solverName: string }) {
    const [rating, setRating] = useState(5);

    const handleSubmit = () => {
        onSubmit(rating);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rate Your Experience with {solverName}</DialogTitle>
                    <DialogDescription>
                        Your feedback helps maintain the quality of our community. Please rate the solution provided on a scale of 0 to 10.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                    <div className="flex justify-center items-center gap-4">
                        <Star className="text-yellow-400" />
                        <span className="text-2xl font-bold w-12 text-center">{rating}</span>
                    </div>
                    <Slider
                        min={0}
                        max={10}
                        step={1}
                        value={[rating]}
                        onValueChange={(value) => setRating(value[0])}
                        className="mt-4"
                    />
                </div>
                <Button onClick={handleSubmit}>Submit Feedback</Button>
            </DialogContent>
        </Dialog>
    );
}

function SolutionForm({ requestId, requesterId }: { requestId: string, requesterId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !content.trim()) return;
        setLoading(true);
        try {
            const solutionCollectionRef = collection(firestore, 'users', requesterId, 'requests', requestId, 'solutions');
            addDocumentNonBlocking(solutionCollectionRef, {
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
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const requestId = Array.isArray(id) ? id[0] : id;
    
    const [request, setRequest] = useState<Request | null>(null);
    const [requestDocRef, setRequestDocRef] = useState<DocumentReference | null>(null);
    const [isRequestLoading, setIsRequestLoading] = useState(true);

    useEffect(() => {
        const findRequest = async () => {
            if (!requestId || !firestore) return;
            setIsRequestLoading(true);
            
            const requestsCollectionGroup = collectionGroup(firestore, 'requests');
            const q = query(requestsCollectionGroup, where('id', '==', requestId));
            
            try {
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const foundDoc = querySnapshot.docs[0];
                    const docData = foundDoc.data() as Omit<Request, 'id'>;
                    setRequest({ ...docData, id: foundDoc.id });
                    setRequestDocRef(foundDoc.ref);
                } else {
                     toast({ variant: 'destructive', title: 'Error', description: 'Request not found.' });
                     router.push('/marketplace');
                }
            } catch (error) {
                console.error("Error finding request:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch request details.' });
                router.push('/marketplace');
            } finally {
                setIsRequestLoading(false);
            }
        };

        const findRequestDoc = async () => {
            if (!requestId || !firestore) return;
            setIsRequestLoading(true);

            const requestsCollection = collectionGroup(firestore, 'requests');
            const q = query(requestsCollection, where('id', '==', requestId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Error', description: 'Request not found.' });
                router.push('/marketplace');
                setIsRequestLoading(false);
                return;
            }

            const requestDoc = querySnapshot.docs[0];
            setRequestDocRef(requestDoc.ref);
            setRequest({ id: requestDoc.id, ...requestDoc.data() } as Request);
            setIsRequestLoading(false);
        }
        
        findRequestDoc();

    }, [requestId, firestore, router, toast]);

    const solutionsQuery = useMemoFirebase(() => {
        if (!requestDocRef) return null;
        return query(collection(requestDocRef, 'solutions'), orderBy('createdAt', 'desc'));
    }, [requestDocRef]);
    
    const { data: solutions, isLoading: areSolutionsLoading } = useCollection<Solution>(solutionsQuery);
    
    const [hydratedSolutions, setHydratedSolutions] = useState<Solution[]>([]);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [solutionToRate, setSolutionToRate] = useState<Solution | null>(null);

    useEffect(() => {
        if (solutions) {
            const fetchSolvers = async () => {
                const hydrated = await Promise.all(solutions.map(async (solution) => {
                    const solverDoc = await getDoc(doc(firestore, 'users', solution.solverId));
                    if(solverDoc.exists()){
                        const solverProfile = solverDoc.data() as UserProfile;
                        return {
                            ...solution,
                            solver: {
                                displayName: solverProfile.displayName,
                                photoURL: solverProfile.photoURL,
                            }
                        }
                    }
                    return solution;
                }));
                setHydratedSolutions(hydrated);
            };
            fetchSolvers();
        }
    }, [solutions, firestore]);

    const isOwner = user?.uid === request?.requesterId;
    const isLoading = isRequestLoading || areSolutionsLoading;

    const handleMarkAsCompleted = async (solution: Solution) => {
        setSolutionToRate(solution);
        setShowFeedbackModal(true);
    };

    const handleFeedbackSubmit = async (rating: number) => {
        if (!request || !user || !solutionToRate || !requestDocRef) return;
    
        setShowFeedbackModal(false);

        try {
            await runTransaction(firestore, async (transaction) => {
                const solverRef = doc(firestore, 'users', solutionToRate.solverId);
                const solutionRef = doc(requestDocRef, 'solutions', solutionToRate.id);
                
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
    
                transaction.update(requestDocRef, { status: 'Completed' });
                transaction.update(solutionRef, { isAccepted: true });
                transaction.update(solverRef, {
                    walletBalance: increment(walletUpdate),
                    xp: increment(reward),
                    level: newLevel,
                    rating: rating // For simplicity, we just set the new rating. A real app would average it.
                });
            });
    
            toast({ title: 'Request Completed!', description: `Reward sent and feedback recorded.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete request.' });
        }
        setSolutionToRate(null);
    };
    
    const handleDeleteRequest = async () => {
        if (!request || !requestDocRef) return;
        try {
            await deleteDoc(requestDocRef);
            toast({ title: 'Request Deleted', description: 'Your request has been removed.' });
            router.push('/my-requests');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete request.' });
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!request) return null;

    const rewardAmount = Math.round(request.cost * REWARD_PERCENTAGE);

    return (
        <div className="container mx-auto p-0 space-y-8">
            {solutionToRate && (
                <FeedbackModal
                    open={showFeedbackModal}
                    onOpenChange={setShowFeedbackModal}
                    onSubmit={handleFeedbackSubmit}
                    solverName={solutionToRate.solver?.displayName || 'Solver'}
                />
            )}
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
                        {(!solutions || solutions.length === 0) && (
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
                <h2 className="text-2xl font-bold font-headline">Solutions ({hydratedSolutions.length})</h2>
                {hydratedSolutions.length > 0 ? (
                    hydratedSolutions.map(solution => (
                        <Card key={solution.id} className={solution.isAccepted ? "border-primary bg-primary/5" : ""}>
                            <CardHeader className="flex flex-row justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={solution.solver?.photoURL} />
                                        <AvatarFallback>{solution.solver?.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{solution.solver?.displayName}</p>
                                        <p className="text-xs text-muted-foreground">{solution.createdAt ? formatDistanceToNow(solution.createdAt.toDate(), { addSuffix: true }) : ''}</p>
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

            {!isOwner && request.status === 'Open' && !solutions?.some(s => s.solverId === user?.uid) && (
                <SolutionForm requestId={requestId} requesterId={request.requesterId} />
            )}
        </div>
    );
}
