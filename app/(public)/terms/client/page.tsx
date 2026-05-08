import Link from "next/link"

import { TERMS_VERSION, COMMUNICATION_POLICY_EXTENDED } from "@/lib/request-options"

export default function ClientTermsPage() {
  const sections = [
    {
      title: "Client responsibilities",
      points: [
        "Provide accurate event details, guest counts, timing, location, and budget information when creating a request or confirming a booking.",
        "Review chef proposals carefully and only confirm services that you genuinely intend to book through the platform.",
        "Treat chefs, support staff, and other users respectfully in all platform interactions.",
      ],
    },
    {
      title: "Platform-only booking and payment",
      points: [
        "All active booking discussions, proposals, scheduling updates, and payments must remain inside the platform.",
        "Clients must not request direct payment, off-platform transfers, or side arrangements for bookings first introduced through the website.",
        "Sharing contact information to move conversations off-platform for active bookings is a breach of these terms and may result in account suspension.",
        COMMUNICATION_POLICY_EXTENDED,
      ],
    },
    {
      title: "Cancellation policy",
      points: [
        "Clients may cancel bookings subject to the timing of cancellation relative to the event date and the chef's cancellation policy.",
        "Cancellations made more than 7 days before the event may qualify for a full refund minus any platform fees.",
        "Cancellations made between 3-7 days before the event may qualify for a 50% refund.",
        "Cancellations made less than 3 days before the event may not be eligible for refund unless exceptional circumstances apply.",
        "The platform reserves the right to review cancellation requests on a case-by-case basis for exceptional circumstances.",
      ],
    },
    {
      title: "Refund policy",
      points: [
        "Refunds are processed back to the original payment method used for the booking.",
        "Refund processing times depend on the payment provider and may take 5-14 business days to appear in your account.",
        "Platform fees are non-refundable once a booking is confirmed and paid, unless the cancellation qualifies for a full refund under our policy.",
        "In cases of chef cancellation or no-show, clients are entitled to a full refund including platform fees.",
      ],
    },
    {
      title: "Dispute resolution",
      points: [
        "In the event of a dispute, clients should first attempt to resolve the issue directly with the chef through the platform messaging system.",
        "If direct resolution fails, clients may escalate the dispute to the platform support team for mediation.",
        "The platform reserves the right to make final decisions on disputes based on available evidence and these terms.",
        "Abusive or fraudulent dispute claims may result in account suspension.",
      ],
    },
    {
      title: "Suspension and platform controls",
      points: [
        "The platform may suspend, restrict, or remove accounts that misuse the service, bypass checkout, share personal contact details for active off-platform transactions, or otherwise breach platform rules.",
        "The platform may pause or remove listings, requests, bookings, or messaging access where moderation, fraud, safety, or compliance concerns arise.",
        "Repeated violations of platform policies may result in permanent account termination.",
      ],
    },
  ]

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
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-4xl">Client Terms</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            These terms explain how clients should use the platform when browsing chefs, creating requests, communicating with chefs, and paying for bookings.
            You must review and accept the current terms before using platform services.
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground sm:gap-3">
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5">Version {TERMS_VERSION}</span>
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5">Applies to client accounts and client-side bookings</span>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} className="brand-card-surface rounded-[26px] p-5 sm:p-6">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">{section.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm leading-7 text-muted-foreground sm:space-y-3">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="brand-soft-panel rounded-[26px] p-5 text-sm leading-7 text-muted-foreground sm:p-6">
          <p className="font-semibold text-foreground">Acceptance of terms</p>
          <p className="mt-2">
            By registering, signing in, creating requests, sending messages, accepting proposals, or paying for bookings through the platform,
            you confirm that you have reviewed and accepted the current client terms and related platform policies.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 text-sm font-medium sm:gap-4">
          <Link href="/terms/chef" className="text-primary hover:underline">Chef Terms</Link>
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link href="/register" className="text-primary hover:underline">Back to registration</Link>
        </div>
      </div>
    </div>
  )
}
