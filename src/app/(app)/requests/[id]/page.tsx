
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
  orderBy,
  updateDoc,
  getDoc,
  writeBatch
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

function RatingDialog({ open, onOpenChange, solverName, onSubmit }: { open: boolean, onOpenChange: (open: boolean) => void, solverName: string, onSubmit: (rating: number) => Promise<void> }) {
    const [rating, setRating] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) return;
        setLoading(true);
        await onSubmit(rating);
        setLoading(false);
        onOpenChange(false);
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Rate {solverName}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Provide feedback to help the community. Your rating is final.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex justify-center py-4">
                    {[1, 2, 3, 4, 5].map(star => (
                        <Star
                            key={star}
                            className={`h-10 w-10 cursor-pointer ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                            onClick={() => setRating(star)}
                        />
                    ))}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Skip</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} disabled={loading || rating === 0}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Rating
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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

    const [processingSolutionId, setProcessingSolutionId] = useState<string | null>(null);
    const [ratingInfo, setRatingInfo] = useState<{ open: boolean, solution: Solution | null }>({ open: false, solution: null });


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
            const newSolutionRef = doc(collection(firestore, "solutions"));
            await setDoc(newSolutionRef, {
                id: newSolutionRef.id,
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

    const handleAcceptSolution = async (solution: Solution) => {
        if (!firestore || !request) return;
        setProcessingSolutionId(solution.id);
    
        try {
            await runTransaction(firestore, async (transaction) => {
                const requestRef = doc(firestore, 'requests', request.id);
                const solverRef = doc(firestore, 'users', solution.solverId);
                const solutionRef = doc(firestore, 'solutions', solution.id);
    
                // 1. Read data
                const requestDoc = await transaction.get(requestRef);
                const solverDoc = await transaction.get(solverRef);
    
                if (!requestDoc.exists() || !solverDoc.exists()) {
                    throw new Error("Request or solver no longer exists.");
                }
    
                const requestData = requestDoc.data() as Request;
                const solverData = solverDoc.data() as UserProfile;
    
                // 2. Safety Check
                if (requestData.status !== 'Open') {
                    throw new Error("This request is already completed.");
                }
    
                // 3. Calculate Values
                const reward = Math.round(requestData.cost * REWARD_PERCENTAGE);
                const xpGain = reward; // 1 coin = 1 XP
                const newXp = solverData.xp + xpGain;
                
                let newBalance = solverData.walletBalance + reward;
                
                // 4. Level-Up Logic
                const currentLevel = solverData.level;
                const calculatedLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
                let finalLevel = currentLevel;
                
                if (calculatedLevel > currentLevel) {
                    const levelsGained = calculatedLevel - currentLevel;
                    const bonus = levelsGained * LEVEL_UP_BONUS;
                    newBalance += bonus;
                    finalLevel = calculatedLevel;
                    toast({ title: 'Level Up!', description: `You reached level ${finalLevel} and earned a bonus of ${bonus} coins!` });
                }
                
                // 5. Write Data
                transaction.update(requestRef, { status: 'Completed' });
                transaction.update(solutionRef, { status: 'Accepted' });
                transaction.update(solverRef, {
                    walletBalance: newBalance,
                    xp: newXp,
                    level: finalLevel,
                });
            });
    
            toast({ title: "Solution Accepted!", description: `Paid ${solution.solverName} ${rewardAmount} coins.` });
            setRatingInfo({ open: true, solution: solution });
    
        } catch (error: any) {
            console.error("Error accepting solution:", error);
            toast({ variant: 'destructive', title: 'Transaction Failed', description: error.message });
        } finally {
            setProcessingSolutionId(null);
        }
    };
    
    const handleRatingSubmit = async (rating: number) => {
        if (!ratingInfo.solution) return;
        
        try {
            const solverRef = doc(firestore, 'users', ratingInfo.solution.solverId);
            // This is a simplified rating update. For a real app, you'd need to store the rating count.
            // For this demo, we'll just set the rating directly. A more robust solution would be a transaction.
            await updateDoc(solverRef, {
                rating: rating // Simplified for demo
            });
            toast({ title: "Rating Submitted", description: "Thank you for your feedback!" });
        } catch (error) {
            console.error("Error submitting rating:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not submit rating." });
        }
    };
    
    const handleDeleteRequest = async () => {
        if (!requestDocRef) return;
        try {
            // Also delete associated solutions
            const q = query(collection(firestore, 'solutions'), where('requestId', '==', requestId));
            const solutionDocs = await getDocs(q);
            const batch = writeBatch(firestore);
            solutionDocs.forEach(doc => batch.delete(doc.ref));
            batch.delete(requestDocRef);
            await batch.commit();

            toast({ title: 'Request Deleted', description: 'Your request and all its solutions have been removed.' });
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
                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete your request and all its solutions.</AlertDialogDescription>
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
                                        {/* You might want to fetch solver's profile for the avatar */}
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
                             {isOwner && request.status === 'Open' && solution.status === 'Pending' && (
                                <CardFooter>
                                    <Button onClick={() => handleAcceptSolution(solution)} disabled={processingSolutionId !== null}>
                                        {processingSolutionId === solution.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                                        Accept & Pay
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-8">No solutions have been submitted yet.</p>
                )}
            </div>

            {ratingInfo.solution && (
                <RatingDialog
                    open={ratingInfo.open}
                    onOpenChange={(open) => setRatingInfo({ open, solution: open ? ratingInfo.solution : null })}
                    solverName={ratingInfo.solution.solverName}
                    onSubmit={handleRatingSubmit}
                />
            )}
        </div>
    );
}

