import Link from "next/link"
import { MailCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

export default async function PendingEmailVerificationPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const role = params.role === "CHEF" ? "CHEF" : "CLIENT"

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-lg rounded-[28px] border border-border bg-background p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="text-primary">
            <MailCheck className="h-7 w-7" />
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Please verify your email.</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Your account has been created, but email verification is required before normal ChefaChef access.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="brand-gradient-button rounded-2xl border-0">
            <Link href={`/login?role=${role}`}>Return to sign in</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
