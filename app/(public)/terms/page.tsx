import Link from "next/link"
import { ArrowRight, FileText, ShieldCheck } from "lucide-react"

import { PublicPageHero } from "@/components/public/public-page-hero"
import { Button } from "@/components/ui/button"
import { buildPublicMetadata } from "@/lib/public-site"

export const metadata = buildPublicMetadata({
  title: "Terms | Chef Marketplace",
  description: "Review Chef Marketplace client terms, chef terms, and privacy information.",
  path: "/terms",
})

const legalLinks = [
  {
    title: "Client Terms",
    description: "Terms for customers creating requests, reviewing proposals, booking chefs, messaging, payments, refunds, and disputes.",
    href: "/terms/client",
  },
  {
    title: "Chef Terms",
    description: "Terms for chefs applying to the marketplace, managing profiles, sending proposals, fulfilling bookings, and receiving payouts.",
    href: "/terms/chef",
  },
  {
    title: "Privacy Policy",
    description: "How account, request, booking, messaging, payment, and support records are handled.",
    href: "/privacy",
  },
]

export default function TermsPage() {
  return (
    <div className="bg-background">
      <PublicPageHero
        eyebrow="Legal"
        title="Terms for clients, chefs, and marketplace privacy."
        description="Choose the policy area that matches how you use Chef Marketplace."
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {legalLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[28px] border border-border/60 bg-background p-6 shadow-sm shadow-black/[0.03] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl hover:shadow-slate-900/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {item.href === "/privacy" ? <ShieldCheck className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
              <span className="mt-5 inline-flex items-center text-sm font-semibold text-primary">
                Open
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-[28px] border border-border/60 bg-muted/20 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">Need access?</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Customers and chefs accept the relevant terms during signup before using marketplace tools.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:mt-0 sm:flex-row">
            <Button asChild variant="outline" className="rounded-2xl border-border/70 bg-background/80">
              <Link href="/login?role=CLIENT">Customer Login</Link>
            </Button>
            <Button asChild className="brand-gradient-button rounded-2xl border-0">
              <Link href="/become-a-chef">Become a Chef</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
