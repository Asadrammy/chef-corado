"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowRight, Sparkles } from "lucide-react"
import loginBackgroundImage from "@/ChatGPT Image Apr 8, 2026, 01_17_26 AM.png"

import { LoginForm } from "@/components/auth/LoginForm"
import { RegisterForm } from "@/components/auth/RegisterForm"

export default function LoginPage() {
  const [mode, setMode] = useState("login")

  return (
    <main className="min-h-screen overflow-y-auto bg-[#0d1320]">
      <div className="relative min-h-screen">
        <Image
          src={loginBackgroundImage}
          alt=""
          fill
          priority
          className="object-cover object-[20%_center]"
        />
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
                  <span className="text-sm font-medium tracking-[0.18em] text-white/90 uppercase">Chef Marketplace</span>
                </div>

                <div className="mt-8 space-y-4">
                  <h1 className="max-w-[10ch] text-5xl font-semibold tracking-[-0.06em] text-white">
                    {mode === "login" ? "Welcome back." : "Create account."}
                  </h1>
                  <p className="max-w-[28rem] text-base leading-7 text-white/78">
                    {mode === "login"
                      ? "Sign in to manage bookings, conversations, and chef operations from one refined workspace."
                      : "Create a new account to access the dashboard."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="mt-8 inline-flex w-fit items-center rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-200 hover:bg-white/16"
                >
                  {mode === "login" ? "Create account" : "Back to sign in"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </section>

            <section className="flex min-h-0 items-center justify-center py-4 lg:justify-end lg:py-8">
              <div className="w-full max-w-lg max-lg:max-h-[calc(100vh-3rem)] max-lg:overflow-y-auto rounded-[28px] border border-white/30 bg-white/75 shadow-[0_24px_60px_rgba(4,10,22,0.22)] backdrop-blur-xl lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
                {mode === "login" ? <LoginForm onToggleMode={() => setMode("register")} /> : <RegisterForm onToggleMode={() => setMode("login")} />}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
