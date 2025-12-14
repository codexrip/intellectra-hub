"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { SecurityLog } from "@/lib/types";
import { LONG_FREEZE_HOURS, MAX_FAILED_ATTEMPTS_LONG, MAX_FAILED_ATTEMPTS_SHORT, SHORT_FREEZE_HOURS } from "@/lib/constants";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const checkAccountFreeze = async (email: string): Promise<string | null> => {
    const securityLogsRef = collection(firestore, 'security_logs');
    const q = query(securityLogsRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;

    const logDoc = querySnapshot.docs[0];
    const log = logDoc.data() as SecurityLog;

    // This may not exist on older documents
    if (!log.lastAttemptTime) return null;

    const now = Timestamp.now();

    const fiveHoursAgo = new Timestamp(now.seconds - SHORT_FREEZE_HOURS * 3600, now.nanoseconds);
    const twentyFourHoursAgo = new Timestamp(now.seconds - LONG_FREEZE_HOURS * 3600, now.nanoseconds);
    
    // Check for 24-hour freeze
    if (log.lastAttemptTime > twentyFourHoursAgo && log.failedAttempts > MAX_FAILED_ATTEMPTS_LONG) {
        const freezeUntil = new Timestamp(log.lastAttemptTime.seconds + LONG_FREEZE_HOURS * 3600, log.lastAttemptTime.nanoseconds);
        if (now < freezeUntil) {
            return `Account frozen for 24 hours due to too many failed attempts. Try again later.`;
        } else {
            // If freeze period is over, reset attempts
            await updateDoc(logDoc.ref, { failedAttempts: 0 });
        }
    }
    
    // Check for 5-hour freeze
    if (log.lastAttemptTime > fiveHoursAgo && log.failedAttempts > MAX_FAILED_ATTEMPTS_SHORT) {
      const freezeUntil = new Timestamp(log.lastAttemptTime.seconds + SHORT_FREEZE_HOURS * 3600, log.lastAttemptTime.nanoseconds);
        if (now < freezeUntil) {
            return `Account frozen temporarily due to multiple failed login attempts. Please try again in a while.`;
        } else {
           await updateDoc(logDoc.ref, { failedAttempts: 0 });
        }
    }

    return null;
  }

  const handleFailedLogin = async (email: string) => {
    const securityLogsRef = collection(firestore, 'security_logs');
    const q = query(securityLogsRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if(querySnapshot.empty) {
        await addDoc(securityLogsRef, {
            email,
            failedAttempts: 1,
            lastAttemptTime: serverTimestamp()
        });
    } else {
        const logDocRef = doc(firestore, 'security_logs', querySnapshot.docs[0].id);
        await updateDoc(logDocRef, {
            failedAttempts: increment(1),
            lastAttemptTime: serverTimestamp()
        });
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const freezeMessage = await checkAccountFreeze(values.email);
    if(freezeMessage) {
        toast({ variant: "destructive", title: "Login Failed", description: freezeMessage });
        setLoading(false);
        return;
    }

    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push("/dashboard");
    } catch (error: any) {
        await handleFailedLogin(values.email);
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        description = "Invalid email or password. Please check your credentials.";
      }
      toast({ variant: "destructive", title: "Login Failed", description });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm mx-4 sm:mx-0">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Login</CardTitle>
        <CardDescription>Enter your email below to login to your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="text-center text-sm text-muted-foreground w-full">
          Don't have an account?{" "}
          <Link href="/register" className="underline text-primary">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
