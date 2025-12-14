"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { UserProfile } from "@/lib/types";


export default function ProfilePage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const userProfileRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const [displayName, setDisplayName] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if(profile) {
            setDisplayName(profile.displayName);
            setPhotoURL(profile.photoURL);
        }
    }, [profile]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfileRef) return;
        setLoading(true);

        try {
            updateDocumentNonBlocking(userProfileRef, {
                displayName,
                photoURL
            });
            toast({
                title: "Success",
                description: "Your profile has been updated.",
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update your profile.",
            });
        } finally {
            setLoading(false);
        }
    };

    if (isProfileLoading || !profile) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="container mx-auto p-0">
            <h1 className="text-3xl font-bold font-headline mb-6">My Profile</h1>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Avatar className="h-20 w-20 border-2 border-primary">
                            <AvatarImage src={photoURL} alt={displayName} />
                            <AvatarFallback className="text-3xl">{displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-center sm:text-left">
                            <CardTitle className="text-2xl">{profile.displayName}</CardTitle>
                            <CardDescription>{profile.email}</CardDescription>
                            {profile.isFrozen && <Badge variant="destructive" className="mt-2">Account Frozen</Badge>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="photoURL">Photo URL</Label>
                            <Input
                                id="photoURL"
                                value={photoURL}
                                onChange={(e) => setPhotoURL(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Profile
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
