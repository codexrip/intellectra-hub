"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { useAuth } from "@/firebase";
import Link from "next/link";
import { Coins, BarChart, LogOut, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { doc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";

const AnimatedNumber = ({ value }: { value: number }) => {
    const [currentValue, setCurrentValue] = useState(value);
  
    useEffect(() => {
      const timeout = setTimeout(() => {
        setCurrentValue(value);
      }, 100);
      return () => clearTimeout(timeout);
    }, [value]);
  
    return <span className="number-animate tabular-nums">{Math.round(currentValue)}</span>;
};

export function Header() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!profile || !user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
          <Coins className="h-5 w-5 text-primary" />
          <span className="font-bold">Coins:</span>
          <AnimatedNumber value={profile.walletBalance} />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
          <BarChart className="h-5 w-5 text-primary" />
          <span className="font-bold">Level:</span>
          <AnimatedNumber value={profile.level} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.photoURL} alt={profile.displayName} />
                <AvatarFallback>
                  {profile.displayName?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
