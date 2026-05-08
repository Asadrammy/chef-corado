"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { FileText, MapPin, Calendar, Star, User, ArrowRight, CheckCircle2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

type ProposalStatus = "PENDING" | "ACCEPTED" | "ACCEPTED_PENDING_PAYMENT" | "REJECTED" | "EXPIRED" | "WITHDRAWN" | "BOOKED"
type ProposalResolution = "ACCEPTED" | "REJECTED"

type ProposalSort = "price-asc" | "price-desc" | "newest"
type ProposalStatusFilter = "all" | ProposalStatus

type ProposalPayload = {
  id: string
  price: string
  message: string | null
  status: ProposalStatus
  createdAt?: string
  chef: {
    name: string | null
    rating?: number
  }
  request?: {
    eventDate: string
    location: string
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

const formatPrice = (value: string) => {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return value
  }
  return `$${parsed.toFixed(2)}`
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

export function ClientProposalsList() {
  const [proposals, setProposals] = React.useState<ProposalPayload[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionLoading, setActionLoading] = React.useState<Record<string, "accept" | "reject" | null>>({})

  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ProposalStatusFilter>("all")
  const [sort, setSort] = React.useState<ProposalSort>("newest")
  const [expandedProposalId, setExpandedProposalId] = React.useState<string | null>(null)

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
                  <Button className="h-11 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-6 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
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
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((proposal) => {
            const chefName = proposal.chef?.name ?? "Chef"
            const eventDate = proposal.request?.eventDate ? new Date(proposal.request.eventDate) : null
            const location = proposal.request?.location ?? "—"
            const message = proposal.message ?? "—"
            const isExpanded = expandedProposalId === proposal.id
            const initials = getInitials(chefName)

            return (
              <div
                key={proposal.id}
                className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex items-start gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={undefined} alt={chefName} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm text-muted-foreground">Chef</div>
                      <div className="text-lg font-semibold truncate">{chefName}</div>
                      <div className="mt-2">
                        <RatingStars value={proposal.chef.rating || 0} />
                      </div>
                    </div>
                  </div>

                  <Badge variant={statusBadgeVariant[proposal.status]}>{formatStatusLabel(proposal.status)}</Badge>
                </div>

                <div className="mt-6">
                  <div className="text-sm text-muted-foreground">Price</div>
                  <div className="text-3xl font-semibold tracking-tight">{formatPrice(proposal.price)}</div>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{eventDate ? format(eventDate, "MMM d, yyyy") : "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{location}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm text-muted-foreground">Message</div>
                  <p className={isExpanded ? "mt-2 text-sm" : "mt-2 text-sm line-clamp-3"}>{message}</p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2">
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
