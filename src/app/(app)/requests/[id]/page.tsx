
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';


// --- MODALS AND FORMS ---

function FeedbackModal({ open, onOpenChange, onSubmit, solverName }: { open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (rating: number) => void, solverName: string }) {
    const [rating, setRating] = useState(5);
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rate Your Experience with {solverName}</DialogTitle>
                    <DialogDescription>Your feedback helps maintain the quality of our community. Please rate the solution provided.</DialogDescription>
                </DialogHeader>
                <div className="py-6">
                    <div className="flex justify-center items-center gap-4">
                        <Star className="text-yellow-400" />
                        <span className="text-2xl font-bold w-12 text-center">{rating}</span>
                    </div>
                    <Slider min={0} max={10} step={1} value={[rating]} onValueChange={(value) => setRating(value[0])} className="mt-4" />
                </div>
                <Button onClick={() => onSubmit(rating)}>Submit Feedback</Button>
            </DialogContent>
        </Dialog>
    );
}

function SolutionForm({ request, onSubmit }: { request: Request, onSubmit: (content: string, link: string) => Promise<void> }) {
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
                    />
                    <Input 
                        placeholder="Link to file/resource (optional)"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
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


// --- MAIN PAGE COMPONENT ---

export default function RequestDetailPage() {
    const { id } = useParams();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const requestId = Array.isArray(id) ? id[0] : id;

    // --- DATA FETCHING ---
    
    const requestDocRef = useMemoFirebase(() => {
        if (!requestId || !firestore) return null;
        // Corrected: Fetch from top-level 'requests' collection
        return doc(firestore, 'requests', requestId);
    }, [requestId, firestore]);
    
    const { data: request, isLoading: isRequestLoading } = useDoc<Request>(requestDocRef);

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: currentUserProfile } = useDoc<UserProfile>(userProfileRef);

    const solutionsQuery = useMemoFirebase(() => {
        if (!requestId || !firestore) return null;
        // Corrected: Query top-level 'solutions' collection
        return query(collection(firestore, 'solutions'), where('requestId', '==', requestId), orderBy('createdAt', 'desc'));
    }, [requestId, firestore]);

    const { data: solutions, isLoading: areSolutionsLoading } = useCollection<Solution>(solutionsQuery);
    
    const [hydratedSolutions, setHydratedSolutions] = useState<(Solution & {solverProfile?: UserProfile})[]>([]);
    
    useEffect(() => {
        if (solutions && firestore) {
            const fetchSolvers = async () => {
                const hydrated = await Promise.all(solutions.map(async (solution) => {
                    const solverDocRef = doc(firestore, 'users', solution.solverId);
                    // Using a transaction is overkill here, a simple get is fine.
                    // This was also causing issues, replacing with a direct getDoc
                    const { getDoc } = await import('firebase/firestore');
                    const solverSnap = await getDoc(solverDocRef);

                    if(solverSnap.exists()){
                        return {
                            ...solution,
                            solverProfile: solverSnap.data() as UserProfile
                        }
                    }
                    return solution;
                }));
                setHydratedSolutions(hydrated);
            };
            fetchSolvers();
        }
    }, [solutions, firestore]);

    
    // --- STATE & DERIVED VALUES ---

    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [solutionToRate, setSolutionToRate] = useState<Solution | null>(null);

    const isOwner = user?.uid === request?.requesterId;
    const hasSubmitted = solutions?.some(s => s.solverId === user?.uid);
    const rewardAmount = request ? Math.round(request.cost * REWARD_PERCENTAGE) : 0;


    // --- HANDLERS ---

    const handleSolutionSubmit = async (content: string, link: string) => {
        if (!user || !currentUserProfile || !request) return;

        try {
            // Corrected: Add to top-level 'solutions' collection
            await addDoc(collection(firestore, 'solutions'), {
                requestId: request.id,
                solverId: user.uid,
                solverName: currentUserProfile.displayName,
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

    const handleMarkAsCompleted = (solution: Solution) => {
        if (!isOwner || request?.status !== 'Open') return;
        setSolutionToRate(solution);
        setShowFeedbackModal(true);
    };

    const handleFeedbackSubmit = async (rating: number) => {
        if (!request || !user || !solutionToRate || !requestDocRef) return;
    
        setShowFeedbackModal(false);

        try {
            await runTransaction(firestore, async (transaction) => {
                const solverRef = doc(firestore, 'users', solutionToRate.solverId);
                // Corrected: solution doc from top-level collection
                const solutionRef = doc(firestore, 'solutions', solutionToRate.id); 
                
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
                transaction.update(solutionRef, { status: 'Accepted' });
                transaction.update(solverRef, {
                    walletBalance: increment(walletUpdate),
                    xp: increment(reward),
                    level: newLevel,
                    rating: (solverProfile.rating * (solverProfile.level -1) + rating) / solverProfile.level 
                });
            });
    
            toast({ title: 'Request Completed!', description: `Reward sent to ${solutionToRate.solverName} and feedback recorded.` });
            
        } catch (error: any) {
            console.error("Failed to complete request transaction:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to complete request.' });
        }
        setSolutionToRate(null);
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


    // --- RENDER ---

    if (isRequestLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!request) {
        return <div className="text-center py-10"><h2>Request not found</h2></div>;
    }

    return (
        <div className="container mx-auto p-0 space-y-8">
            {solutionToRate && (
                <FeedbackModal
                    open={showFeedbackModal}
                    onOpenChange={setShowFeedbackModal}
                    onSubmit={handleFeedbackSubmit}
                    solverName={solutionToRate.solverName || 'Solver'}
                />
            )}
            
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
                        {isOwner && request.status === 'Open' && (
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
                </div>
                
                {/* --- Action Zone --- */}
                <div className="space-y-6">
                    {isOwner ? (
                        <Card>
                           <CardHeader>
                                <CardTitle>Waiting for Solutions</CardTitle>
                                <CardDescription>Solutions submitted by other users will appear here. You can then review them and accept the best one.</CardDescription>
                            </CardHeader>
                        </Card>
                    ) : request.status === 'Open' && !hasSubmitted ? (
                        <SolutionForm request={request} onSubmit={handleSolutionSubmit} />
                    ) : request.status === 'Open' && hasSubmitted ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Solution Submitted</CardTitle>
                                <CardDescription>You have already submitted a solution for this request. Please wait for the requester to review it.</CardDescription>
                            </CardHeader>
                        </Card>
                    ) : null}
                </div>
            </div>

            {/* --- Solutions Section --- */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-headline">Solutions ({solutions?.length || 0})</h2>
                {areSolutionsLoading ? (
                     <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : hydratedSolutions.length > 0 ? (
                    hydratedSolutions.map(solution => (
                        <Card key={solution.id} className={solution.status === 'Accepted' ? "border-primary bg-primary/5" : ""}>
                            <CardHeader className="flex flex-row justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={solution.solverProfile?.photoURL} />
                                        <AvatarFallback>{solution.solverName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{solution.solverName}</p>
                                        <p className="text-xs text-muted-foreground">{solution.createdAt ? formatDistanceToNow(new Date((solution.createdAt as unknown as Timestamp).seconds * 1000), { addSuffix: true }) : ''}</p>
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
                                    <Button onClick={() => handleMarkAsCompleted(solution)}><CheckCircle className="mr-2 h-4 w-4"/>Accept Solution</Button>
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
