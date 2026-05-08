import Link from "next/link"

import { TERMS_VERSION, COMMUNICATION_POLICY_EXTENDED } from "@/lib/request-options"

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-24 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-8">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to home
        </Link>
      </div>

      <div className="brand-surface space-y-8 rounded-[32px] p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="space-y-4 rounded-[28px] border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Legal</p>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-4xl">Privacy Policy</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            This page explains the platform data used to operate requests, proposals, bookings, messaging, payments, support, and moderation.
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground sm:gap-3">
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5">Version {TERMS_VERSION}</span>
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5">Applies to account, booking, and message records</span>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          <section className="brand-card-surface rounded-[26px] p-5 text-sm leading-7 text-muted-foreground sm:p-6">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Information we use</h2>
            <p className="mt-4">We use account, request, proposal, booking, payout, and messaging records to run the platform, support users, and maintain transaction history.</p>
            <p className="mt-3">We may also use moderation, verification, and audit information where needed to support safety, compliance, and dispute handling inside the platform.</p>
          </section>

          <section className="brand-card-surface rounded-[26px] p-5 text-sm leading-7 text-muted-foreground sm:p-6">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Payments and transaction records</h2>
            <p className="mt-4">Payments are handled through connected payment providers. The application stores transaction references and operational payment data needed for bookings, support, finance reporting, and payout workflows.</p>
            <p className="mt-3">Sensitive card details are not intended to be stored directly in this application beyond provider-linked records and references required for support and reconciliation.</p>
          </section>

          <section className="brand-card-surface rounded-[26px] p-5 text-sm leading-7 text-muted-foreground sm:p-6">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Data retention and deletion</h2>
            <p className="mt-4">Account data is retained for as long as your account is active to provide platform services.</p>
            <p className="mt-3">Transaction and booking records are retained for legal, accounting, and dispute resolution purposes for a minimum of 7 years after account closure, as required by applicable laws.</p>
            <p className="mt-3">You may request deletion of your account and personal data by contacting support, subject to legal retention requirements.</p>
          </section>

          <section className="brand-card-surface rounded-[26px] p-5 text-sm leading-7 text-muted-foreground sm:p-6">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Data security</h2>
            <p className="mt-4">We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
            <p className="mt-3">Payment data is processed through PCI-compliant payment providers and is not stored on our servers beyond necessary transaction references.</p>
          </section>

          <section className="brand-card-surface rounded-[26px] p-5 text-sm leading-7 text-muted-foreground sm:p-6 md:col-span-2">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Communication and policy enforcement</h2>
            <p className="mt-4">{COMMUNICATION_POLICY_EXTENDED}</p>
            <p className="mt-3">Platform communications and booking records may be used for customer support, moderation, fraud prevention, and resolving operational issues connected to active transactions.</p>
            <p className="mt-3">We monitor for policy violations including off-platform communication attempts to protect user safety and platform integrity.</p>
            <p className="mt-3">If platform terms, legal wording, or operational processes change, the latest published website version applies from the effective date shown on the relevant policy page.</p>
          </section>
        </div>

        <div className="flex flex-wrap gap-3 text-sm font-medium sm:gap-4">
          <Link href="/terms/client" className="text-primary hover:underline">Client Terms</Link>
          <Link href="/terms/chef" className="text-primary hover:underline">Chef Terms</Link>
          <Link href="/register" className="text-primary hover:underline">Back to registration</Link>
        </div>
      </div>
    </div>
  )
}
