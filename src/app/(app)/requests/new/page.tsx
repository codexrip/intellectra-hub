"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { collection, addDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Request, RequestType, Urgency, UserProfile } from '@/lib/types';
import { URGENCY_COST, TYPE_COST } from '@/lib/constants';
import { Coins, Loader2 } from 'lucide-react';

const requestTypes: RequestType[] = ['Project Material', 'Collaboration', 'Teaching Material', 'Others'];
const urgencies: Urgency[] = ['Low', 'Medium', 'High', 'Extreme'];

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  type: z.enum(requestTypes as [RequestType, ...RequestType[]]),
  urgency: z.enum(urgencies as [Urgency, ...Urgency[]]),
});

export default function NewRequestPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const selectedType = form.watch('type');
  const selectedUrgency = form.watch('urgency');

  const totalCost = useMemo(() => {
    const typeCost = selectedType ? TYPE_COST[selectedType] : 0;
    const urgencyCost = selectedUrgency ? URGENCY_COST[selectedUrgency] : 0;
    return typeCost + urgencyCost;
  }, [selectedType, selectedUrgency]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !profile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a request.' });
        return;
    }

    if (profile.walletBalance < totalCost) {
        toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'You do not have enough coins to create this request.' });
        return;
    }

    setLoading(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const userDocRef = doc(firestore, 'users', user.uid);
            
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists() || userDoc.data().walletBalance < totalCost) {
                throw new Error("Insufficient funds.");
            }
            
            transaction.update(userDocRef, {
                walletBalance: userDoc.data().walletBalance - totalCost
            });
            
            const newRequestRef = doc(collection(firestore, 'requests'));
            const newRequest: Omit<Request, 'id'> = {
                requesterId: user.uid,
                ...values,
                cost: totalCost,
                status: 'Open',
                createdAt: serverTimestamp() as any, // Let server generate timestamp
            };
            transaction.set(newRequestRef, newRequest);
        });

        toast({ title: 'Success!', description: 'Your request has been posted.' });
        router.push('/my-requests');
    } catch (error) {
        console.error('Error creating request:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create request. Please try again.' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-0">
      <h1 className="text-3xl font-bold font-headline mb-6">Create a New Request</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                    <CardTitle>Request Details</CardTitle>
                    <CardDescription>Provide a clear title and detailed description for your request.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., I need a React component for a pricing table" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe your requirements in detail..." rows={8} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                 <CardHeader>
                    <CardTitle>Categorization</CardTitle>
                    <CardDescription>Help others find your request.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a request type" />
                            </Trigger>
                          </FormControl>
                          <SelectContent>
                            {requestTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an urgency level" />
                            </Trigger>
                          </FormControl>
                          <SelectContent>
                            {urgencies.map(urgency => (
                              <SelectItem key={urgency} value={urgency}>{urgency}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                    <CardTitle>Cost Preview</CardTitle>
                </CardHeader>
                <CardContent className="text-center p-6 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <div className="flex items-center justify-center gap-2 text-4xl font-bold font-headline text-primary">
                        <Coins className="h-8 w-8" />
                        <span>{totalCost}</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" size="lg" disabled={loading || totalCost === 0}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Submit Request
                    </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
