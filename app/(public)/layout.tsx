import { PublicShell } from "@/components/public/public-shell";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicShell>
      <div className="bg-background text-foreground">
        {children}
      </div>
    </PublicShell>
  );
}

