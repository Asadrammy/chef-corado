"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CheckCircle, LockKeyhole, Mail, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email")
      }

      setSubmitted(true)
      toast.success("Reset email sent successfully!")
    } catch (error) {
      console.error("Error sending reset email:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-[#0d1320]">
      <div className="relative min-h-screen">
        <Image src="/images/login-bg.png" alt="" fill priority className="object-cover object-[20%_center]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,16,24,0.28)_0%,rgba(12,16,24,0.12)_26%,rgba(12,16,24,0.03)_52%,rgba(255,255,255,0.03)_78%,rgba(255,255,255,0.06)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_42%,rgba(10,16,28,0.04)_100%)]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center px-6 py-6 sm:px-10 lg:px-16">
          <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_480px]">
            <section className="hidden min-h-0 items-center lg:flex">
              <div className="max-w-md text-left text-white">
                <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/18 bg-white/8 px-4 py-2 backdrop-blur-md">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b82f6_0%,#7c3aed_100%)] text-white shadow-[0_12px_28px_rgba(59,130,246,0.35)]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium tracking-[0.18em] text-white uppercase">Chef Marketplace</span>
                </div>

                <div className="mt-8 space-y-4">
                  <h1 className="max-w-[10ch] text-5xl font-semibold tracking-[-0.06em] text-white">Reset access.</h1>
                  <p className="max-w-[28rem] text-base leading-7 text-white/78">
                    Request a secure password reset link, then return to the right marketplace workspace.
                  </p>
                </div>

                <div className="mt-8 flex flex-col items-start gap-3">
                  <Link
                    href="/login"
                    className="inline-flex w-fit items-center rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-200 hover:bg-white/16"
                  >
                    Back to Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex w-fit items-center rounded-full border border-white/12 bg-black/10 px-4 py-2.5 text-sm font-semibold text-white/76 shadow-[0_10px_26px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 hover:border-white/22 hover:bg-white/10 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Homepage
                  </Link>
                </div>
              </div>
            </section>

            <section className="flex min-h-0 items-center justify-center py-4 lg:justify-end lg:py-8">
              <div className="flex w-full max-w-lg flex-col items-center gap-4">
                <div className="w-full rounded-[28px] border border-white/30 bg-white/75 shadow-[0_24px_60px_rgba(4,10,22,0.22)] backdrop-blur-xl max-lg:max-h-[calc(100vh-6rem)] max-lg:overflow-y-auto lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
                  <div className="brand-auth-surface relative w-full overflow-hidden rounded-[32px] p-5 md:p-6">
                    <div className="brand-auth-divider absolute inset-x-8 top-0 h-px" />
                    <div className="brand-auth-orb absolute right-[-3rem] top-[-2rem] h-32 w-32 rounded-full blur-3xl" />

                    <div className="relative space-y-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                          <div className="brand-auth-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]">
                            <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                            Secure access
                          </div>
                          <div className="space-y-2">
                            <h1 className="text-[1.85rem] font-semibold tracking-[-0.07em] text-foreground md:text-[2.35rem] md:leading-[0.96]">
                              Forgot Password?
                            </h1>
                            <p className="max-w-sm text-sm leading-5 text-muted-foreground md:text-[15px]">
                              Enter your email address and we&apos;ll send you a link to reset your password.
                            </p>
                          </div>
                        </div>
                        <div className="brand-gradient-button flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_14px_28px_hsl(var(--primary)/0.24)]">
                          {submitted ? <CheckCircle className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
                        </div>
                      </div>
                    </div>

                    <div className="relative mt-6 space-y-5">
                      {submitted ? (
                        <Alert className="items-start rounded-2xl border-green-600/20 bg-green-50/90 text-green-800 shadow-none">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription className="text-green-800">
                            If an account exists for {email}, a password reset link has been sent.
                          </AlertDescription>
                        </Alert>
                      ) : null}

                      <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                            Email
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
                            <Input
                              id="email"
                              type="email"
                              autoComplete="email"
                              placeholder="name@example.com"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              className="h-12 rounded-[18px] border border-[#d7dfeb] bg-[#ffffff] px-4 pl-11 text-[15px] text-[#0f172a] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 placeholder:text-[#98a2b3] hover:border-[#c5d0df] focus-visible:border-[#2159d6] focus-visible:ring-[4px] focus-visible:ring-[rgba(33,89,214,0.12)]"
                              required
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="brand-gradient-button group h-12 w-full rounded-[18px] border-0 shadow-[0_18px_38px_hsl(var(--primary)/0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_46px_hsl(var(--primary)/0.34)] focus-visible:ring-[4px] focus-visible:ring-[hsl(var(--primary)/0.16)]"
                          disabled={loading}
                        >
                          {loading ? "Sending..." : "Send Reset Link"}
                        </Button>
                      </form>

                      <div className="border-t border-[rgba(215,223,235,0.92)] pt-4 text-center text-sm text-[#667085]">
                        <Link href="/login" className="font-semibold text-[#101828] transition-colors hover:text-[#1849be]">
                          Back to Sign In
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-white/24 bg-white/12 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-200 hover:bg-white/18 lg:hidden"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Homepage
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
