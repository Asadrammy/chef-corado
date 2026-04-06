"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="h-screen overflow-hidden bg-[#eef3f9]">
      <div className="relative h-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f7f9fc_30%,#edf2f8_62%,#e8eef6_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,66,172,0.10)_0%,rgba(99,76,196,0.09)_36%,rgba(255,255,255,0)_70%)]" />
        <div className="absolute left-[-9rem] top-[-8rem] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,#2159d6_0%,rgba(33,89,214,0.14)_38%,rgba(33,89,214,0)_72%)] blur-3xl" />
        <div className="absolute right-[-8rem] top-[6%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,#6d56d9_0%,rgba(109,86,217,0.16)_34%,rgba(109,86,217,0)_72%)] blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[14%] h-[22rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(61,106,214,0.16)_0%,rgba(61,106,214,0.05)_42%,rgba(61,106,214,0)_76%)] blur-3xl" />
        <div className="absolute inset-x-[10%] top-[14%] h-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.48)_42%,rgba(255,255,255,0)_78%)] blur-3xl" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(92,110,139,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(92,110,139,0.08)_1px,transparent_1px)] [background-size:84px_84px] [mask-image:radial-gradient(circle_at_center,black_34%,transparent_82%)]" />

        <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="grid h-full min-h-0 w-full items-center gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:gap-10">
            <section className="relative order-1 hidden h-full min-h-0 overflow-hidden rounded-[40px] border border-white/60 bg-[linear-gradient(155deg,rgba(255,255,255,0.74),rgba(248,250,253,0.92),rgba(241,245,250,0.78))] px-7 py-8 shadow-[0_26px_90px_rgba(24,43,77,0.10)] backdrop-blur-2xl sm:flex sm:px-8 sm:py-9 lg:px-10 lg:py-10">
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(33,89,214,0),rgba(33,89,214,0.30),rgba(109,86,217,0.24),rgba(33,89,214,0))]" />
              <div className="absolute right-[-4rem] top-[-1rem] h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(109,86,217,0.18)_0%,rgba(109,86,217,0.03)_58%,rgba(109,86,217,0)_78%)] blur-3xl" />
              <div className="relative flex h-full min-h-0 flex-col justify-between gap-12 overflow-y-auto pr-2">
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-3 rounded-full border border-[rgba(206,216,232,0.9)] bg-[rgba(255,255,255,0.72)] px-4 py-2.5 shadow-[0_10px_28px_rgba(37,58,97,0.08)] backdrop-blur-xl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(145deg,#1849be_0%,#6854d2_100%)] text-white shadow-[0_12px_28px_rgba(38,76,183,0.24)]">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#0f172a]">Chef Marketplace</p>
                      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#6b7280]">Precision interface for premium hospitality</p>
                    </div>
                  </div>

                  <div className="max-w-[42rem] space-y-6">
                    <h1 className="max-w-[10.5ch] text-[2.8rem] font-semibold tracking-[-0.08em] text-[#0b1324] sm:text-[3.4rem] lg:text-[4.8rem] lg:leading-[0.9]">
                      Operate with the confidence of a real product.
                    </h1>
                    <p className="max-w-[40rem] text-[15px] leading-8 text-[#526072] sm:text-lg">
                      A deliberately crafted control surface for bookings, communication, and operations with calmer contrast, premium spacing, and clearer focus.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[30px] border border-[rgba(205,214,229,0.92)] bg-[rgba(255,255,255,0.64)] p-5 shadow-[0_14px_36px_rgba(36,55,92,0.07)] backdrop-blur-xl">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(24,73,190,0.07)] text-[#1849be] ring-1 ring-[rgba(24,73,190,0.08)]">
                        <CheckCircle2 className="h-5.5 w-5.5" />
                      </div>
                      <p className="text-sm font-semibold text-[#101828]">Focused workspaces</p>
                      <p className="mt-2 text-sm leading-6 text-[#667085]">Clear operational separation for chefs, clients, and administrators.</p>
                    </div>

                    <div className="rounded-[30px] border border-[rgba(205,214,229,0.92)] bg-[rgba(255,255,255,0.64)] p-5 shadow-[0_14px_36px_rgba(36,55,92,0.07)] backdrop-blur-xl">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(104,84,210,0.08)] text-[#5f47d6] ring-1 ring-[rgba(104,84,210,0.10)]">
                        <ShieldCheck className="h-5.5 w-5.5" />
                      </div>
                      <p className="text-sm font-semibold text-[#101828]">Trusted access</p>
                      <p className="mt-2 text-sm leading-6 text-[#667085]">Secure authentication presented in a more refined, product-grade shell.</p>
                    </div>

                    <div className="rounded-[30px] border border-[rgba(205,214,229,0.92)] bg-[rgba(255,255,255,0.64)] p-5 shadow-[0_14px_36px_rgba(36,55,92,0.07)] backdrop-blur-xl">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(37,86,203,0.08)] text-[#2556cb] ring-1 ring-[rgba(37,86,203,0.10)]">
                        <ArrowRight className="h-5.5 w-5.5" />
                      </div>
                      <p className="text-sm font-semibold text-[#101828]">Fast return to work</p>
                      <p className="mt-2 text-sm leading-6 text-[#667085]">Move directly into active tasks, requests, and live booking flow.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 rounded-[30px] border border-[rgba(203,213,227,0.92)] bg-[linear-gradient(180deg,rgba(255,255,255,0.70),rgba(248,250,253,0.56))] p-5 shadow-[0_14px_34px_rgba(30,45,79,0.07)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-[#101828]">Designed with stronger intent</p>
                    <p className="text-sm leading-6 text-[#667085]">Less template energy, more product-grade clarity, balance, and restraint.</p>
                  </div>
                  <Link href="/register" className="inline-flex items-center justify-center rounded-full border border-[rgba(196,206,221,0.96)] bg-[rgba(255,255,255,0.88)] px-4 py-2.5 text-sm font-semibold text-[#162033] shadow-[0_8px_20px_rgba(28,43,75,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(95,71,214,0.24)] hover:text-[#1849be]">
                    Create account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>

            <section className="order-2 flex h-full min-h-0 w-full items-center justify-center lg:justify-end">
              <div className="flex h-full min-h-0 w-full max-w-md items-center justify-center lg:max-w-none">
                <div className="w-full max-w-md overflow-y-auto py-2 lg:max-w-none lg:overflow-visible lg:py-0">
                  <LoginForm />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
