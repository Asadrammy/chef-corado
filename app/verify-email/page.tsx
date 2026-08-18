import Link from "next/link"
import { CheckCircle2, MailWarning, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildLoginPath, sanitizeCallbackUrl, verifyEmailToken } from "@/lib/email-verification"

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; callbackUrl?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl)
  const result = params.token ? await verifyEmailToken(params.token) : { status: "INVALID" as const }

  const success = result.status === "VERIFIED" || result.status === "ALREADY_VERIFIED"
  const loginPath = success ? buildLoginPath(result.user.role, callbackUrl) : "/login"
  const title = success
    ? result.status === "VERIFIED" ? "Email verified successfully." : "Email already verified."
    : result.status === "EXPIRED" ? "Verification link expired." : "Verification link invalid."
  const description = success
    ? "You can now sign in and continue your ChefaChef workflow."
    : result.status === "EXPIRED"
      ? "Please request a new verification email from the sign-in screen or your registration confirmation."
      : "Please use the latest verification email or request a new verification link."
  const Icon = success ? CheckCircle2 : result.status === "EXPIRED" ? MailWarning : ShieldAlert

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-lg rounded-[28px] border border-border bg-background p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className={success ? "text-emerald-600" : "text-amber-600"}>
            <Icon className="h-7 w-7" />
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="brand-gradient-button rounded-2xl border-0">
            <Link href={loginPath}>Continue to sign in</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
