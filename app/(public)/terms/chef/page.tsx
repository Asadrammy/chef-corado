import Link from "next/link"

import { TERMS_VERSION, CHEF_LEGAL_ACKNOWLEDGEMENT, COMMUNICATION_POLICY_EXTENDED } from "@/lib/request-options"

export default function ChefTermsPage() {
  const sections = [
    {
      title: "Chef responsibilities",
      points: [
        "Keep your profile, pricing, availability, menus, experiences, and service information accurate and up to date.",
        "Only offer services you are prepared to fulfill through the platform and respond to client requests in a professional manner.",
        "Meet your food safety, event-service, and local operating responsibilities for the services you choose to offer.",
      ],
    },
    {
      title: "Communication and payment on-platform",
      points: [
        "All active booking discussions, proposals, scheduling, and payment arrangements must remain inside the platform.",
        "Chefs must not request direct payment, off-platform transfers, or personal contact exchanges intended to bypass the platform checkout flow.",
        "Soliciting off-platform payment or contact information for active bookings is a breach of these terms and may result in account suspension.",
        COMMUNICATION_POLICY_EXTENDED,
      ],
    },
    {
      title: "Bookings, no-shows, and profile accuracy",
      points: [
        "Chefs are responsible for honouring accepted bookings unless the platform confirms a change, cancellation, or moderation action.",
        "Late cancellations, no-shows, or materially inaccurate listing information may result in account review, booking restrictions, or suspension.",
        "Where availability, pricing, or service scope changes, the chef should update the platform records promptly.",
        "No-shows without valid justification may result in full refund to the client and potential account suspension.",
      ],
    },
    {
      title: "Cancellation and refund obligations",
      points: [
        "Chefs may cancel bookings only with valid justification and must provide reasonable notice to the client and platform.",
        "When a chef cancels, the platform will process a full refund to the client including platform fees.",
        "Chefs who frequently cancel bookings may face account restrictions or suspension.",
        "Chefs must honour their stated cancellation policy as displayed on their profile.",
      ],
    },
    {
      title: "Insurance, approval, and payouts",
      points: [
        CHEF_LEGAL_ACKNOWLEDGEMENT,
        "Chef access to public discovery, booking readiness, and payouts may depend on profile approval, current legal acknowledgement, and successful payment onboarding.",
        "The platform may hold, review, delay, or restrict payouts where moderation, booking status, compliance, or payment processing issues require review.",
        "Platform commission fees are deducted from payments before payouts are released to chefs.",
        "Payouts are processed according to the platform's payout schedule, typically within 3-7 business days after booking completion.",
      ],
    },
    {
      title: "Suspension and platform controls",
      points: [
        "The platform may suspend, restrict, hide, or remove chef accounts, listings, proposals, or messaging access where policy breaches, safety concerns, fraud indicators, or compliance issues are identified.",
        "Suspended chefs may be removed from public search, discovery, and booking flows until access is restored by the platform.",
        "Repeated violations of platform policies may result in permanent account termination.",
        "The platform reserves the right to investigate any reported violations and take appropriate action.",
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
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-4xl">Chef Terms</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            These terms explain how chefs should use the platform when publishing profiles, responding to requests, accepting bookings, receiving payouts, and maintaining platform compliance.
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground sm:gap-3">
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5">Version {TERMS_VERSION}</span>
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5">Applies to chef profiles, bookings, and payouts</span>
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
            By registering as a chef, publishing a profile, sending proposals, accepting bookings, connecting payout details, or continuing to use chef tools,
            you confirm that you have reviewed and accepted the current chef terms and related platform policies.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 text-sm font-medium sm:gap-4">
          <Link href="/terms/client" className="text-primary hover:underline">Client Terms</Link>
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link href="/register" className="text-primary hover:underline">Back to registration</Link>
        </div>
      </div>
    </div>
  )
}
