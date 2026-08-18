"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { FileText, MapPin, Calendar, Star, User, ArrowRight, CheckCircle2, Columns3, MessageSquare } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { analytics } from "@/lib/analytics"
import { formatCurrency } from "@/lib/currency"
import {
  formatServiceDateSummary,
  formatShortDate,
  type MultiDayDateLike,
  type ProposalLineItemLike,
} from "@/lib/multi-day-display"
import { cn } from "@/lib/utils"

type ProposalStatus = "PENDING" | "ACCEPTED" | "ACCEPTED_PENDING_PAYMENT" | "REJECTED" | "EXPIRED" | "WITHDRAWN" | "BOOKED"
type ProposalResolution = "ACCEPTED" | "REJECTED"

type ProposalSort = "price-asc" | "price-desc" | "newest"
type ProposalStatusFilter = "all" | ProposalStatus

type ProposalPayload = {
  id: string
  price: string
  currency?: string
  message: string | null
  status: ProposalStatus
  createdAt?: string
  lineItems?: ProposalLineItemLike[]
  chef: {
    userId?: string
    name: string | null
    rating?: number
    reviewCount?: number
    profileImage?: string | null
  }
  request?: {
    title?: string | null
    requestMode?: string | null
    eventDate: string
    multiDayDates?: MultiDayDateLike[]
    location: string
    guestCount?: number | null
    preferredTime?: string | null
    budgetMode?: string | null
  }
  menu?: {
    id: string
    title: string
    description?: string | null
    cuisineType?: string | null
    menuType?: string | null
    price?: number | null
    currency?: string | null
  }
}

const statusBadgeVariant: Record<ProposalStatus, "secondary" | "default" | "destructive" | "outline"> = {
  PENDING: "secondary",
  ACCEPTED: "default",
  ACCEPTED_PENDING_PAYMENT: "outline",
  REJECTED: "destructive",
  EXPIRED: "destructive",
  WITHDRAWN: "destructive",
  BOOKED: "default",
}

const formatStatusLabel = (value: ProposalStatus) => `${value[0]}${value.slice(1).toLowerCase()}`

const formatPrice = (value: string, currency = "GBP") => {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return value
  }
  return formatCurrency(parsed, currency)
}

const getNumericPrice = (value: string) => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

const getInitials = (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) return "CH"
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  const first = tokens[0]?.[0] ?? "C"
  const second = tokens.length > 1 ? tokens[tokens.length - 1]?.[0] : tokens[0]?.[1]
  return `${first}${second ?? ""}`.toUpperCase()
}

function RatingStars({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(5, Math.round(value)))

  return (
    <div className="flex items-center gap-0.5" aria-label={`${normalized} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={
            index < normalized
              ? "h-4 w-4 fill-yellow-400 text-yellow-400"
              : "h-4 w-4 text-muted-foreground"
          }
        />
      ))}
    </div>
  )
}

function getMenuPriceLabel(menu: ProposalPayload["menu"]) {
  if (!menu) return "No menu attached"
  if (menu.menuType === "PRICED" && typeof menu.price === "number" && menu.price > 0) {
    return formatCurrency(menu.price, menu.currency ?? "GBP")
  }
  return "Pricing discussed with your request"
}

function getProposalDateLabel(proposal: ProposalPayload) {
  if (proposal.request?.requestMode === "MULTI_DAY" || proposal.request?.multiDayDates?.length) {
    return formatServiceDateSummary(proposal.request?.multiDayDates, proposal.request?.eventDate)
  }

  const eventDate = proposal.request?.eventDate ? new Date(proposal.request.eventDate) : null
  if (!eventDate || Number.isNaN(eventDate.getTime())) {
    return "Not specified"
  }

  const date = format(eventDate, "MMM d, yyyy")
  return proposal.request?.preferredTime ? `${date}, ${proposal.request.preferredTime}` : date
}

function ProposalLineItemsBreakdown({ proposal }: { proposal: ProposalPayload }) {
  const items = proposal.lineItems ?? []
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Daily line items are not available for this proposal. Review the proposal total and message.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${proposal.id}-${item.serviceDate ?? index}`} className="rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{formatShortDate(item.serviceDate)}</p>
              <p className="text-sm text-muted-foreground">{item.title || "Service day"}</p>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(Number(item.price ?? 0), item.currency ?? proposal.currency ?? "GBP")}
            </p>
          </div>
          {item.description ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function ClientProposalsList() {
  const [proposals, setProposals] = React.useState<ProposalPayload[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionLoading, setActionLoading] = React.useState<Record<string, "accept" | "reject" | null>>({})

  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ProposalStatusFilter>("all")
  const [sort, setSort] = React.useState<ProposalSort>("newest")
  const [expandedProposalId, setExpandedProposalId] = React.useState<string | null>(null)
  const [selectedProposalIds, setSelectedProposalIds] = React.useState<string[]>([])
  const [compareMode, setCompareMode] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true

    const loadProposals = async () => {
      if (!isMounted) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/proposals", {
          cache: "no-store",
          credentials: "include",
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const errorMessage = typeof payload?.error === 'string'
            ? payload.error
            : payload?.error?.message || "Unable to load proposals"
          throw new Error(errorMessage)
        }

        const payload: { proposals: ProposalPayload[] } = await response.json()
        if (isMounted) {
          setProposals(payload.proposals ?? [])
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Something went wrong")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProposals()

    return () => {
      isMounted = false
    }
  }, [])

  const handleAction = React.useCallback(async (proposalId: string, resolution: ProposalResolution) => {
    const currentProposal = proposals.find((proposal) => proposal.id === proposalId)
    if (!currentProposal) return

    setActionLoading((prev) => ({ ...prev, [proposalId]: resolution === "ACCEPTED" ? "accept" : "reject" }))
    setError(null)
    setProposals((current) =>
      current.map((proposal) => (proposal.id === proposalId ? { ...proposal, status: resolution } : proposal))
    )

    try {
      const response = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ proposalId, status: resolution }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const errorMessage = typeof payload?.error === 'string'
          ? payload.error
          : payload?.error?.message || "Unable to update proposal"
        throw new Error(errorMessage)
      }

      const payload: { proposal: ProposalPayload } = await response.json()
      setProposals((current) =>
        current.map((proposal) => (proposal.id === proposalId ? { ...proposal, status: payload.proposal.status } : proposal))
      )

      // Auto-redirect to payment if proposal was accepted
      if (resolution === "ACCEPTED") {
        analytics.track('proposal_accepted', undefined, { proposalId, chefName: currentProposal.chef?.name });
        setTimeout(() => {
          window.location.href = `/dashboard/client/proposals/payment?proposalId=${proposalId}`
        }, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      if (currentProposal) {
        setProposals((current) =>
          current.map((proposal) => (proposal.id === proposalId ? { ...proposal, status: currentProposal.status } : proposal))
        )
      }
    } finally {
      setActionLoading((current) => ({ ...current, [proposalId]: null }))
    }
  }, [proposals])

  const selectedProposals = React.useMemo(
    () => selectedProposalIds
      .map((proposalId) => proposals.find((proposal) => proposal.id === proposalId))
      .filter((proposal): proposal is ProposalPayload => Boolean(proposal)),
    [proposals, selectedProposalIds]
  )

  const toggleProposalSelection = React.useCallback((proposalId: string) => {
    setSelectedProposalIds((current) => {
      if (current.includes(proposalId)) {
        return current.filter((id) => id !== proposalId)
      }
      if (current.length >= 3) {
        return current
      }
      return [...current, proposalId]
    })
    setCompareMode(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-[28px] border border-dashed border-border/80 bg-background/50 px-6 py-12">
        <Spinner className="text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">Loading proposals…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-destructive/60 bg-destructive/5 p-6 text-sm text-destructive">
        {error}
      </div>
    )
  }

  const filtered = proposals
    .filter((proposal) => {
      if (statusFilter !== "all" && proposal.status !== statusFilter) {
        return false
      }

      const chefName = proposal.chef?.name ?? "Chef"
      if (searchQuery.trim().length) {
        return chefName.toLowerCase().includes(searchQuery.trim().toLowerCase())
      }

      return true
    })
    .sort((a, b) => {
      if (sort === "newest") {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      }
      if (sort === "price-asc") {
        return getNumericPrice(a.price) - getNumericPrice(b.price)
      }
      if (sort === "price-desc") {
        return getNumericPrice(b.price) - getNumericPrice(a.price)
      }
      return 0
    })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-[26px] border border-white/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex-1">
          <Input
            placeholder="Search chefs..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 rounded-full border-white/60 bg-white/80 px-4 shadow-sm focus-visible:border-white focus-visible:bg-white focus-visible:shadow-md"
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProposalStatusFilter)}>
            <SelectTrigger className="h-10 w-[150px] rounded-full border-white/60 bg-white/80 px-3 shadow-sm">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value) => setSort(value as ProposalSort)}>
            <SelectTrigger className="h-10 w-[190px] rounded-full border-white/60 bg-white/80 px-3 shadow-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-asc">Price (Low → High)</SelectItem>
              <SelectItem value="price-desc">Price (High → Low)</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {proposals.length ? (
        <div className="mb-6 flex flex-col gap-3 rounded-[24px] border border-white/60 bg-white/80 px-4 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Compare proposals</p>
            <p className="text-sm text-muted-foreground">
              Select 2 to 3 proposals to compare price, menu, message, status, and payment context side by side.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={selectedProposalIds.length === 0}
              onClick={() => {
                setSelectedProposalIds([])
                setCompareMode(false)
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={selectedProposalIds.length < 2}
              onClick={() => setCompareMode(true)}
            >
              <Columns3 className="mr-2 h-4 w-4" />
              Compare Selected ({selectedProposalIds.length})
            </Button>
          </div>
        </div>
      ) : null}

      {!proposals.length ? (
        <section className="rounded-[30px] border border-white/60 bg-white/80 p-8 shadow-xl shadow-slate-900/5 backdrop-blur">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">No proposals yet</h2>
              <p className="mt-2 text-muted-foreground text-sm max-w-lg">
                Once your request is live, chefs will send you personalized offers with pricing and availability.
              </p>

              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground/70" />
                  <span>Post your request</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground/70" />
                  <span>Wait for chef offers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground/70" />
                  <span>Compare and choose</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/dashboard/client/create-request">
                  <Button className="brand-gradient-button h-11 rounded-2xl px-6 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                    Create Request
                  </Button>
                </Link>
                <Link href="/dashboard/client/requests">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1">
                    See how it works <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="text-base font-medium text-foreground">What happens next</div>
                  <div>• Chefs send offers</div>
                  <div>• You compare pricing</div>
                  <div>• You book confidently</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <div className="rounded-[24px] border border-white/60 bg-white/80 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">No proposals match your filters</h2>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search, filter, or sort options.</p>
            </div>
          </div>
        </div>
      ) : compareMode && selectedProposals.length >= 2 ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Proposal comparison</h2>
              <p className="text-sm text-muted-foreground">Side-by-side view of your selected chef proposals.</p>
            </div>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setCompareMode(false)}>
              Back to list
            </Button>
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-white/60 bg-white/90 shadow-sm">
            <table className="min-w-[820px] w-full text-sm">
              <caption className="sr-only">Selected proposal comparison</caption>
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="w-48 px-4 py-3 text-left font-semibold text-muted-foreground">Criteria</th>
                  {selectedProposals.map((proposal) => {
                    const chefName = proposal.chef?.name ?? "Chef"
                    return (
                      <th key={proposal.id} className="px-4 py-3 text-left align-top">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10">
                            <AvatarImage src={proposal.chef.profileImage ?? undefined} alt={chefName} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {getInitials(chefName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{chefName}</p>
                            <Badge variant={statusBadgeVariant[proposal.status]} className="mt-1">
                              {formatStatusLabel(proposal.status)}
                            </Badge>
                          </div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  {
                    label: "Price",
                    render: (proposal: ProposalPayload) => formatPrice(proposal.price, proposal.currency),
                  },
                  {
                    label: "Currency",
                    render: (proposal: ProposalPayload) => proposal.currency ?? "GBP",
                  },
                  {
                    label: "Event timing",
                    render: (proposal: ProposalPayload) => getProposalDateLabel(proposal),
                  },
                  {
                    label: "Request type",
                    render: (proposal: ProposalPayload) =>
                      proposal.request?.requestMode === "MULTI_DAY" || proposal.request?.multiDayDates?.length
                        ? "Multi-Day Chef Hire"
                        : "Standard request",
                  },
                  {
                    label: "Daily prices",
                    render: (proposal: ProposalPayload) =>
                      proposal.lineItems?.length
                        ? proposal.lineItems
                            .map((item) => `${formatShortDate(item.serviceDate)}: ${formatCurrency(Number(item.price ?? 0), item.currency ?? proposal.currency ?? "GBP")}`)
                            .join(" | ")
                        : "Not itemized",
                  },
                  {
                    label: "Location",
                    render: (proposal: ProposalPayload) => proposal.request?.location ?? "Not specified",
                  },
                  {
                    label: "Guests",
                    render: (proposal: ProposalPayload) => proposal.request?.guestCount ? `${proposal.request.guestCount}` : "Not specified",
                  },
                  {
                    label: "Menu",
                    render: (proposal: ProposalPayload) => proposal.menu?.title ?? "No menu attached",
                  },
                  {
                    label: "Menu summary",
                    render: (proposal: ProposalPayload) => proposal.menu?.description ?? "Not specified",
                  },
                  {
                    label: "Menu pricing",
                    render: (proposal: ProposalPayload) => getMenuPriceLabel(proposal.menu),
                  },
                  {
                    label: "Included services",
                    render: () => "Not specified by chef",
                  },
                  {
                    label: "Reviews",
                    render: (proposal: ProposalPayload) =>
                      proposal.chef.reviewCount
                        ? `${(proposal.chef.rating ?? 0).toFixed(1)} from ${proposal.chef.reviewCount} review${proposal.chef.reviewCount === 1 ? "" : "s"}`
                        : "No reviews yet",
                  },
                  {
                    label: "Response date",
                    render: (proposal: ProposalPayload) =>
                      proposal.createdAt ? format(new Date(proposal.createdAt), "MMM d, yyyy") : "Not specified",
                  },
                  {
                    label: "Payment",
                    render: (proposal: ProposalPayload) =>
                      proposal.status === "ACCEPTED_PENDING_PAYMENT"
                        ? "Accepted. Payment is required to confirm the booking."
                        : proposal.status === "PENDING"
                          ? "Payment becomes available after accepting this proposal."
                          : "Payment not available for this status.",
                  },
                ].map((row) => (
                  <tr key={row.label} className="align-top">
                    <th className="px-4 py-4 text-left font-semibold text-muted-foreground">{row.label}</th>
                    {selectedProposals.map((proposal) => (
                      <td key={`${proposal.id}-${row.label}`} className="max-w-[260px] px-4 py-4 text-foreground">
                        <span className={row.label === "Menu summary" ? "line-clamp-5" : undefined}>
                          {row.render(proposal)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="align-top">
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Message</th>
                  {selectedProposals.map((proposal) => (
                    <td key={`${proposal.id}-message`} className="max-w-[260px] px-4 py-4 text-foreground">
                      <p className="line-clamp-6">{proposal.message ?? "Not specified"}</p>
                    </td>
                  ))}
                </tr>
                <tr className="align-top">
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Actions</th>
                  {selectedProposals.map((proposal) => (
                    <td key={`${proposal.id}-actions`} className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {proposal.chef.userId ? (
                          <Button asChild variant="outline" size="sm" className="rounded-full">
                            <Link href={`/dashboard/chat?userId=${proposal.chef.userId}`}>
                              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                              Message
                            </Link>
                          </Button>
                        ) : null}
                        {proposal.status === "ACCEPTED_PENDING_PAYMENT" ? (
                          <Button asChild size="sm" className="rounded-full">
                            <Link href={`/dashboard/client/proposals/payment?proposalId=${proposal.id}`}>Pay</Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="rounded-full"
                            disabled={proposal.status !== "PENDING" || actionLoading[proposal.id] === "accept"}
                            onClick={() => handleAction(proposal.id, "ACCEPTED")}
                          >
                            {actionLoading[proposal.id] === "accept" ? "Accepting..." : "Accept"}
                          </Button>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((proposal) => {
            const chefName = proposal.chef?.name ?? "Chef"
            const eventDate = proposal.request?.eventDate ? new Date(proposal.request.eventDate) : null
            const location = proposal.request?.location ?? "-"
            const message = proposal.message ?? "-"
            const isExpanded = expandedProposalId === proposal.id
            const isSelected = selectedProposalIds.includes(proposal.id)
            const selectionDisabled = !isSelected && selectedProposalIds.length >= 3
            const initials = getInitials(chefName)
            const isMultiDay = proposal.request?.requestMode === "MULTI_DAY" || Boolean(proposal.request?.multiDayDates?.length)

            return (
              <div
                key={proposal.id}
                className={cn(
                  "rounded-[26px] border bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                  isSelected ? "border-primary/70 ring-2 ring-primary/15" : "border-white/60"
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2">
                  <label htmlFor={`compare-${proposal.id}`} className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Checkbox
                      id={`compare-${proposal.id}`}
                      checked={isSelected}
                      disabled={selectionDisabled}
                      onCheckedChange={() => toggleProposalSelection(proposal.id)}
                    />
                    Compare
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {selectionDisabled ? "Limit 3" : "Select up to 3"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex items-start gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={proposal.chef.profileImage ?? undefined} alt={chefName} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm text-muted-foreground">Chef</div>
                      <div className="text-lg font-semibold truncate">{chefName}</div>
                      <div className="mt-2">
                        {proposal.chef.reviewCount ? (
                          <div className="flex items-center gap-2">
                            <RatingStars value={proposal.chef.rating || 0} />
                            <span className="text-xs text-muted-foreground">
                              {proposal.chef.reviewCount} review{proposal.chef.reviewCount === 1 ? "" : "s"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No reviews yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge variant={statusBadgeVariant[proposal.status]}>{formatStatusLabel(proposal.status)}</Badge>
                </div>

                <div className="mt-6">
                  <div className="text-sm text-muted-foreground">Price</div>
                  <div className="text-3xl font-semibold tracking-tight">{formatPrice(proposal.price, proposal.currency)}</div>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  {isMultiDay ? (
                    <Badge variant="outline" className="w-fit rounded-full border-orange-200 bg-orange-50 text-orange-700">
                      Multi-Day Chef Hire
                    </Badge>
                  ) : null}
                  {isMultiDay ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{getProposalDateLabel(proposal)}</span>
                    </div>
                  ) : null}
                  {!isMultiDay ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{eventDate ? format(eventDate, "MMM d, yyyy") : "-"}</span>
                  </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{location}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
                  <div className="text-sm text-muted-foreground">Attached menu</div>
                  <div className="mt-1 font-semibold text-foreground">{proposal.menu?.title ?? "No menu attached"}</div>
                  {proposal.menu ? (
                    <p className="mt-1 line-clamp-2 text-muted-foreground">
                      {proposal.menu.cuisineType ? `${proposal.menu.cuisineType}. ` : ""}
                      {proposal.menu.description ?? getMenuPriceLabel(proposal.menu)}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">The chef can still tailor a menu after you discuss the request.</p>
                  )}
                </div>

                <div className="mt-6">
                  <div className="text-sm text-muted-foreground">Message</div>
                  <p className={isExpanded ? "mt-2 text-sm" : "mt-2 text-sm line-clamp-3"}>{message}</p>
                </div>

                {isExpanded && isMultiDay ? (
                  <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="mb-3 text-sm font-semibold text-foreground">Daily price breakdown</div>
                    <ProposalLineItemsBreakdown proposal={proposal} />
                    <div className="mt-3 border-t border-border/60 pt-3 text-sm font-semibold text-foreground">
                      Total proposal: {formatPrice(proposal.price, proposal.currency)}
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {proposal.chef.userId ? (
                    <Button variant="outline" asChild className="rounded-full">
                      <Link href={`/dashboard/chat?userId=${proposal.chef.userId}`}>
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        Message
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setExpandedProposalId((current) => (current === proposal.id ? null : proposal.id))}
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </Button>
                  {proposal.status === "ACCEPTED_PENDING_PAYMENT" ? (
                    <Button
                      className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => window.location.href = `/dashboard/client/proposals/payment?proposalId=${proposal.id}`}
                    >
                      Complete Payment
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={proposal.status !== "PENDING" || actionLoading[proposal.id] === "accept"}
                        onClick={() => handleAction(proposal.id, "ACCEPTED")}
                      >
                        {actionLoading[proposal.id] === "accept" ? "Accepting..." : "Accept"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="rounded-full text-muted-foreground hover:text-foreground"
                        disabled={proposal.status !== "PENDING" || actionLoading[proposal.id] === "reject"}
                        onClick={() => handleAction(proposal.id, "REJECTED")}
                      >
                        {actionLoading[proposal.id] === "reject" ? "Rejecting..." : "Reject"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
