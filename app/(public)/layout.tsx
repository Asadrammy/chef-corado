export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="h-dvh overflow-y-auto bg-background text-foreground overscroll-behavior-contain">
      {children}
    </main>
  );
}
