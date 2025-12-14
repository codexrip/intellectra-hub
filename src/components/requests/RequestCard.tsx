import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Request, Urgency } from "@/lib/types";
import { REWARD_PERCENTAGE } from "@/lib/constants";
import { Coins, Zap } from "lucide-react";

interface RequestCardProps {
    request: Request;
}

const urgencyStyles: Record<Urgency, string> = {
    "Low": "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300",
    "Medium": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300",
    "High": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300",
    "Extreme": "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300",
}

export function RequestCard({ request }: RequestCardProps) {
    const rewardAmount = Math.round(request.cost * REWARD_PERCENTAGE);

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
                </CardHeader>
                <CardContent className="flex-grow">
                    <CardDescription className="line-clamp-3">{request.description}</CardDescription>
                </CardContent>
                <CardFooter className="flex justify-between items-center text-sm font-medium">
                    <span className="text-muted-foreground">Reward</span>
                    <div className="flex items-center gap-1 text-primary font-bold">
                        <Coins className="h-4 w-4" />
                        <span>{rewardAmount} Coins</span>
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}
