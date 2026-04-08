"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as CustomThemeProvider } from "@/context/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    const callbackCookie = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("__Secure-next-auth.callback-url=") || cookie.startsWith("next-auth.callback-url="))

    if (!callbackCookie) {
      return
    }

    const [, rawValue = ""] = callbackCookie.split("=")

    try {
      const decodedValue = decodeURIComponent(rawValue)
      const callbackOrigin = new URL(decodedValue).origin

      if (callbackOrigin !== window.location.origin) {
        document.cookie = `__Secure-next-auth.callback-url=; Path=/; Max-Age=0; SameSite=Lax; Secure`
        document.cookie = `next-auth.callback-url=; Path=/; Max-Age=0; SameSite=Lax`
      }
    } catch {
      document.cookie = `__Secure-next-auth.callback-url=; Path=/; Max-Age=0; SameSite=Lax; Secure`
      document.cookie = `next-auth.callback-url=; Path=/; Max-Age=0; SameSite=Lax`
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <CustomThemeProvider>
        <SessionProvider>
          {children}
        </SessionProvider>
      </CustomThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
