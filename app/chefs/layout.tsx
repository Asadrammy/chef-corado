import { PublicShell } from "@/components/public/public-shell";

export default function ChefsPublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicShell>{children}</PublicShell>;
}
