import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Image 
          src="/il.png"
          alt="Intellectra Hub Logo"
          width={200}
          height={50}
          priority
        />
      </div>
      {children}
    </div>
  );
}
