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

type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED"
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
  }
  request?: {
    eventDate: string
    location: string
  }
}

const statusBadgeVariant: Record<ProposalStatus, "secondary" | "default" | "destructive"> = {
  PENDING: "secondary",
  ACCEPTED: "default",
  REJECTED: "destructive",
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

const getChefRating = (_proposal: ProposalPayload) => {
  return 0
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
          throw new Error(payload?.error || "Unable to load proposals")
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
        throw new Error(payload?.error || "Unable to update proposal")
      }

      const payload: { proposal: ProposalPayload } = await response.json()
      setProposals((current) =>
        current.map((proposal) => (proposal.id === proposalId ? { ...proposal, status: payload.proposal.status } : proposal))
      )

      // Auto-refresh bookings if proposal was accepted
      if (resolution === "ACCEPTED") {
        analytics.track('booking_confirmed', undefined, { proposalId, chefName: currentProposal.chef?.name });
        setTimeout(() => {
          window.location.href = '/dashboard/client/bookings'
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
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 bg-background/40 px-6 py-12">
        <Spinner className="text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">Loading proposals…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/60 bg-destructive/5 p-6 text-sm text-destructive">
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
      <div className="mb-6 bg-white rounded-full px-4 py-3 border shadow-sm flex items-center gap-4 flex-wrap">
        <div className="flex-1">
          <Input
            placeholder="Search chefs..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 rounded-full bg-gray-50 border-gray-100 px-4 focus-visible:ring-2 focus-visible:ring-black/10"
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProposalStatusFilter)}>
            <SelectTrigger className="h-10 w-[150px] rounded-full bg-gray-50 border-gray-100 px-3">
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
            <SelectTrigger className="h-10 w-[190px] rounded-full bg-gray-50 border-gray-100 px-3">
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
        <section className="bg-white rounded-3xl p-8 shadow-lg shadow-gray-200/60 border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">No proposals yet</h2>
              <p className="mt-2 text-gray-500 text-sm max-w-lg">
                Once your request is live, chefs will send you personalized offers with pricing and availability.
              </p>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-black/70" />
                  <span>Post your request</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-black/70" />
                  <span>Wait for chef offers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-black/70" />
                  <span>Compare and choose</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/dashboard/client/create-request">
                  <Button className="rounded-full px-6 bg-black text-white shadow-md hover:shadow-lg hover:scale-[1.02] hover:bg-gray-900 transition active:scale-95">
                    Create Request
                  </Button>
                </Link>
                <Link href="/dashboard/client/requests">
                  <span className="text-sm text-gray-500 hover:text-black transition inline-flex items-center gap-1">
                    See how it works <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-black/70" />
                </div>
                <div className="space-y-2">
                  <div className="text-base font-medium">What happens next</div>
                  <div className="text-sm text-gray-500">• Chefs send offers</div>
                  <div className="text-sm text-gray-500">• You compare pricing</div>
                  <div className="text-sm text-gray-500">• You book confidently</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-black/70" />
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
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex items-start gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={undefined} alt={chefName} />
                      <AvatarFallback className="bg-black/5 text-black/70 text-xs font-semibold">
                        {initials || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm text-muted-foreground">Chef</div>
                      <div className="text-lg font-semibold truncate">{chefName}</div>
                      <div className="mt-2">
                        <RatingStars value={getChefRating(proposal)} />
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

                <div className="mt-6 flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setExpandedProposalId((current) => (current === proposal.id ? null : proposal.id))}
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </Button>
                  <Button
                    className="rounded-full bg-black text-white hover:bg-gray-900"
                    disabled={proposal.status !== "PENDING" || actionLoading[proposal.id] === "accept"}
                    onClick={() => handleAction(proposal.id, "ACCEPTED")}
                  >
                    {actionLoading[proposal.id] === "accept" ? "Accepting…" : "Accept"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:text-black"
                    disabled={proposal.status !== "PENDING" || actionLoading[proposal.id] === "reject"}
                    onClick={() => handleAction(proposal.id, "REJECTED")}
                  >
                    {actionLoading[proposal.id] === "reject" ? "Rejecting…" : "Reject"}
                  </Button>
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
