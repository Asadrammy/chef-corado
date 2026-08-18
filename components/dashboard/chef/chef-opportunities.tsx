"use client"

import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, Clock3, MapPin, Send, Sparkles, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProposalModal } from "@/components/proposal-modal"
import { ChefDashboardRequestItem } from "@/lib/chef-dashboard"
import { formatCurrency } from "@/lib/currency"

interface ChefOpportunitiesProps {
  requests: ChefDashboardRequestItem[]
  availableRequestsCount: number
}

export function ChefOpportunities({ requests, availableRequestsCount }: ChefOpportunitiesProps) {
  return (
    <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <div className="space-y-1.5">
          <div className="text-primary inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Nearby demand
          </div>
          <CardTitle className="text-foreground text-xl font-semibold tracking-tight">Opportunities</CardTitle>
          <p className="text-muted-foreground text-sm leading-6">
            Review nearby requests and prioritize the best-fit bookings.
          </p>
        </div>
        <Button variant="outline" className="rounded-2xl border-white/70 bg-white/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5" asChild>
          <Link href="/dashboard/chef/requests">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableRequestsCount === 0 ? (
          <div className="rounded-3xl border border-dashed border-primary/20 bg-[linear-gradient(180deg,hsl(var(--brand-primary)/0.08),rgba(255,255,255,0.7))] p-8 shadow-inner dark:bg-[linear-gradient(180deg,hsl(var(--brand-primary)/0.14),rgba(255,255,255,0.03))]">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="from-primary/15 to-primary/5 text-primary mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
                <BriefcaseBusiness className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <p className="text-foreground text-lg font-semibold tracking-tight">No open requests nearby right now</p>
                <p className="text-muted-foreground text-sm leading-6">
                Keep your profile and availability up to date so you can convert new demand quickly.
                </p>
              </div>
              <Button className="brand-gradient-button mt-5 rounded-2xl px-5 shadow-lg shadow-primary/20" asChild>
                <Link href="/dashboard/chef/profile">Strengthen profile</Link>
              </Button>
            </div>
          </div>
        ) : (
          requests.slice(0, 4).map((request) => (
            <div
              key={request.id}
              className="group flex flex-col gap-4 rounded-3xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),hsl(var(--brand-surface)/0.86))] p-5 shadow-sm shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] lg:flex-row lg:items-start lg:justify-between"
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                    <Sparkles className="text-primary h-3.5 w-3.5" />
                    Opportunity match
                  </div>
                  <h3 className="text-foreground text-lg font-semibold tracking-tight">{request.title}</h3>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm leading-6">
                    {request.clientName ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
                        <Users className="h-4 w-4" />
                        {request.clientName}
                      </span>
                    ) : null}
                    {request.location ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
                        <MapPin className="h-4 w-4" />
                        {request.location}
                      </span>
                    ) : null}
                    {request.eventDate ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
                        <Clock3 className="h-4 w-4" />
                        {new Date(request.eventDate).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
                <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-left shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 lg:min-w-[132px] lg:text-right">
                  <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">Budget</p>
                  <p className="text-foreground mt-2 text-xl font-semibold tracking-tight">{formatCurrency(request.budget, request.currency)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    className="rounded-2xl border-white/70 bg-white/70 px-4 shadow-sm backdrop-blur transition-all duration-300 dark:border-white/10 dark:bg-white/5" 
                    asChild
                  >
                    <Link href={`/dashboard/chef/requests/${request.id}`}>Details</Link>
                  </Button>
                  <ProposalModal 
                    request={{
                      id: request.id,
                      eventDate: request.eventDate || new Date().toISOString(),
                      location: request.location || "",
                      budget: request.budget,
                      currency: request.currency,
                      details: request.title,
                    }}
                  >
                    <Button className="brand-gradient-button rounded-2xl px-4 shadow-lg shadow-primary/20 transition-all duration-300 group-hover:-translate-y-0.5">
                      <Send className="mr-1.5 h-4 w-4" />
                      Send Quote
                    </Button>
                  </ProposalModal>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
