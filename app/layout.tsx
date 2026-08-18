import "./globals.css";
import "../styles/modal-fix.css";
import "../styles/chart-animations.css";
import Providers from "@/components/providers";
import { getConfiguredAppBaseUrl } from "@/lib/site-config";

const appBaseUrl = getConfiguredAppBaseUrl();

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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className="h-full">
      <body className="min-h-full">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
