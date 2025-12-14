
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Request, Urgency } from "@/lib/types";
import { REWARD_PERCENTAGE } from "@/lib/constants";
import { Coins, Zap } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

interface RequestCardProps {
    request: Request;
}

const urgencyStyles: Record<Urgency, string> = {
    "Low": "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/50 dark:text-gray-300",
    "Medium": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300",
    "High": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300",
    "Extreme": "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300",
}

export function RequestCard({ request }: RequestCardProps) {
    const rewardAmount = Math.round(request.cost * REWARD_PERCENTAGE);
    const postedAt = request.createdAt ? formatDistanceToNow(new Date((request.createdAt as Timestamp).seconds * 1000), { addSuffix: true }) : '';

    return (
        <Link href={`/requests/${request.id}`}>
            <Card className="h-full flex flex-col hover:border-primary/80 hover:shadow-lg transition-all duration-200">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <Badge variant="secondary">{request.type}</Badge>
                        <Badge className={urgencyStyles[request.urgency]}>
                            <Zap className="h-3 w-3 mr-1"/>
                            {request.urgency}
                        </Badge>
                    </div>
                    <CardTitle className="pt-2 line-clamp-2">{request.title}</CardTitle>
                    <CardDescription>
                       Posted {postedAt}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="line-clamp-3 text-sm text-muted-foreground">{request.description}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center text-sm font-medium mt-auto pt-4">
                    <span className="font-bold text-green-600">Reward</span>
                    <div className="flex items-center gap-1 text-green-600 font-bold">
                        <Coins className="h-4 w-4" />
                        <span>{rewardAmount} Coins</span>
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}
