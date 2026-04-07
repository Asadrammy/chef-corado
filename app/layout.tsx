import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/modal-fix.css";
import "../styles/chart-animations.css";
import Providers from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });
const appBaseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(appBaseUrl),
};

// Prevent static generation for all pages
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className="h-full overflow-hidden">
      <body className={`${inter.className} h-full overflow-hidden`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
