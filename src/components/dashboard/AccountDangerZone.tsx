'use client';

import { useState } from 'react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { deleteUser, signOut } from 'firebase/auth';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AccountDangerZone() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<'freeze' | 'delete' | null>(null);

  const handleFreezeAccount = async () => {
    if (!user) return;
    setLoading('freeze');
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, { accountStatus: 'frozen' });
      await signOut(auth);
      toast({ title: 'Account Frozen', description: 'Your account has been frozen. Please contact support to reactivate.' });
      router.push('/login');
    } catch (error) {
      console.error('Error freezing account:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to freeze account.' });
      setLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading('delete');
    try {
      // 1. Delete Firestore document
      const userDocRef = doc(firestore, 'users', user.uid);
      await deleteDoc(userDocRef);

      // 2. Delete Firebase Auth user
      await deleteUser(user);
      
      toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted.' });
      router.push('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      let description = 'Failed to delete account. Please sign out and sign back in before trying again.';
      if(error.code === 'auth/requires-recent-login'){
        description = "This is a sensitive operation. Please sign out and sign back in before deleting your account.";
      }
      toast({ variant: 'destructive', title: 'Error', description });
      setLoading(null);
    }
  };

  return (
    <Card className="border-red-500/50">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
        <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">Freeze Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to freeze your account?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be logged out and will not be able to log back in until your account is manually reactivated by an administrator.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleFreezeAccount} disabled={loading === 'freeze'} className="bg-yellow-600 hover:bg-yellow-700">
                {loading === 'freeze' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Freeze My Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">Delete Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} disabled={loading === 'delete'} className="bg-red-600 hover:bg-red-700">
                {loading === 'delete' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Delete My Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </CardContent>
    </Card>
  );
}
