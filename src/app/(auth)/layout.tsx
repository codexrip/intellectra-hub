import { Lightbulb } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="p-2 bg-primary rounded-full">
            <Lightbulb className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary">Intellectra Hub</h1>
      </div>
      {children}
    </div>
  );
}
