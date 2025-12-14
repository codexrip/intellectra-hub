"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { UserProfile } from "@/lib/types";

export const useAuth = () => {
    const { user, isUserLoading: loading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: profile } = useDoc<UserProfile>(userProfileRef);

    return { user, profile, loading };
};
