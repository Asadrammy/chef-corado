"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Check, X, Eye, MapPin, ChefHat, Clock3, UtensilsCrossed, ShieldCheck } from "lucide-react"
import {
  decodeChefSpecialties,
  getChefCareerStageShortLabel,
  getChefSpecialtyLabel,
  normalizeChefCareerStage,
} from "@/lib/chef-onboarding-options"

interface ChefProfile {
  id: string
  bio?: string
  experience?: number
  profileImage?: string | null
  careerStage?: string | null
  specialties?: string | null
  chefType?: string | null
  verificationStatus?: string | null
  reviewNotes?: string | null
  location: string
  radius: number
  isApproved: boolean
  isBanned?: boolean
  banReason?: string | null
  banAdminNotes?: string | null
  bannedAt?: string | null
  insuranceAcknowledgedAt?: string | null
  insuranceVersion?: string | null
  createdAt: string
  user: {
    id: string
    name: string
    firstName?: string | null
    surname?: string | null
    email: string
    isBanned?: boolean
    banReason?: string | null
    banAdminNotes?: string | null
    bannedAt?: string | null
    termsAcceptedAt?: string | null
    termsVersion?: string | null
  }
  _count: {
    experiences: number
    bookings: number
  }
}

export default function AdminChefsPage() {
  const [chefs, setChefs] = useState<ChefProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "SUSPENDED">("ALL")

  const approvedChefs = chefs.filter((chef) => chef.isApproved && !chef.user.isBanned && !chef.isBanned).length
  const pendingChefs = chefs.filter((chef) => !chef.isApproved).length
  const suspendedChefs = chefs.filter((chef) => chef.user.isBanned || chef.isBanned).length
  const totalExperiences = chefs.reduce((total, chef) => total + chef._count.experiences, 0)
  const totalBookings = chefs.reduce((total, chef) => total + chef._count.bookings, 0)
  const visibleChefs = chefs.filter((chef) => {
    if (statusFilter === "PENDING") return !chef.isApproved && !chef.user.isBanned && !chef.isBanned
    if (statusFilter === "APPROVED") return chef.isApproved && !chef.user.isBanned && !chef.isBanned
    if (statusFilter === "SUSPENDED") return chef.user.isBanned || chef.isBanned
    return true
  })

  useEffect(() => {
    fetchChefs()
  }, [])

  const fetchChefs = async () => {
    try {
      const response = await fetch("/api/admin/chefs")
      if (!response.ok) {
        throw new Error("Failed to fetch chefs")
      }
      const data = await response.json()
      setChefs(data)
    } catch (err) {
      setError("Failed to load chefs")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (chefId: string) => {
    setActionLoading(chefId)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/chefs/${chefId}/approve`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to approve chef")
      }

      setSuccess("Chef approved successfully")
      fetchChefs()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError("Failed to approve chef")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (chefId: string) => {
    if (!confirm("Reject this chef application? The profile and documents will be preserved for audit history.")) {
      return
    }

    setActionLoading(chefId)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/chefs/${chefId}/reject`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to reject chef")
      }

      setSuccess("Chef rejected successfully")
      fetchChefs()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError("Failed to reject chef")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-border/60 bg-background/70 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          Loading chef profiles...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-background/95 p-8 shadow-xl shadow-black/[0.04]">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
        <div className="relative space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
              <ChefHat className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                Admin workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Chef Management</h1>
            </div>
          </div>

          <div className="max-w-3xl space-y-2">
            <p className="text-base text-muted-foreground md:text-lg">
              Review and manage chef applications and profiles
            </p>
            <p className="text-sm leading-6 text-muted-foreground/90">
              Track approvals, monitor marketplace supply, and review profile quality from one unified admin surface.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 shadow-sm transition-all duration-200 hover:bg-muted/40 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ChefHat className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="rounded-full border-border/60 bg-background/80 px-3 py-1 text-xs font-medium">
                  Total
                </Badge>
              </div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">{chefs.length}</div>
              <p className="mt-1 text-sm text-muted-foreground">Chef profiles in review pipeline</p>
            </div>

            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <Badge className="rounded-full border-0 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Approved
                </Badge>
              </div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">{approvedChefs}</div>
              <p className="mt-1 text-sm text-muted-foreground">Active approved chef accounts</p>
            </div>

            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/60 dark:bg-amber-950/20"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock3 className="h-5 w-5" />
                </div>
                <Badge className="rounded-full border-0 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Pending
                </Badge>
              </div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">{pendingChefs}</div>
              <p className="mt-1 text-sm text-muted-foreground">Applications waiting for action</p>
            </button>

            <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 shadow-sm transition-all duration-200 hover:bg-muted/40 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="rounded-full border-border/60 bg-background/80 px-3 py-1 text-xs font-medium">
                  Activity
                </Badge>
              </div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">{suspendedChefs}</div>
              <p className="mt-1 text-sm text-muted-foreground">Suspended chefs hidden from public discovery</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-lg shadow-black/[0.03] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/75">
                Operations overview
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Approval queue</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Review pending chef applications and manage existing chefs with a cleaner, high-signal table view.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium">
              {pendingChefs} pending review
            </Badge>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => setStatusFilter("PENDING")}>
              Review pending applications
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setStatusFilter("ALL")}>
              Show all chefs
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-lg shadow-black/[0.03] backdrop-blur-sm">
          <div className="space-y-1">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/75">
              Marketplace snapshot
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Engagement</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-muted/25 px-4 py-3">
              <span className="text-sm text-muted-foreground">Total bookings</span>
              <span className="text-lg font-semibold text-foreground">{totalBookings}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-muted/25 px-4 py-3">
              <span className="text-sm text-muted-foreground">Average bookable services / chef</span>
              <span className="text-lg font-semibold text-foreground">
                {chefs.length > 0 ? (totalExperiences / chefs.length).toFixed(1) : "0.0"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {success && (
          <Alert className="rounded-2xl border border-green-200/70 bg-green-50/90 shadow-sm dark:border-green-900/50 dark:bg-green-950/20">
            <AlertDescription className="text-sm font-medium text-green-800 dark:text-green-300">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="rounded-2xl border border-red-200/70 bg-red-50/90 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
            <AlertDescription className="text-sm font-medium text-red-800 dark:text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Card className="overflow-hidden rounded-[28px] border border-border/60 bg-background/95 py-0 shadow-xl shadow-black/[0.04]">
        <CardHeader className="border-b border-border/60 px-8 py-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/75">
                Chef applications
              </div>
              <CardTitle className="text-2xl font-semibold tracking-tight">Review and manage chefs</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6">
                Review pending chef applications and manage existing chefs
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
                {chefs.length} total chefs
              </Badge>
              <Badge className="rounded-full border-0 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {pendingChefs} pending
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {visibleChefs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 shadow-sm">
                <ChefHat className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">No chef profiles found</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {statusFilter === "ALL"
                  ? "New chef applications and approved profiles will appear here once they exist in the marketplace."
                  : "No chef applications match the selected filter."}
              </p>
            </div>
          ) : (
            <div className="px-6 pb-6">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-14 bg-muted/40 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Chef</TableHead>
                    <TableHead className="h-14 bg-muted/40 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Location</TableHead>
                    <TableHead className="h-14 bg-muted/40 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Years of Experience</TableHead>
                    <TableHead className="h-14 bg-muted/40 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bookable Services</TableHead>
                    <TableHead className="h-14 bg-muted/40 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bookings</TableHead>
                    <TableHead className="h-14 bg-muted/40 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</TableHead>
                    <TableHead className="h-14 bg-muted/40 px-5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleChefs.map((chef) => {
                    const careerStage = normalizeChefCareerStage(chef.careerStage, chef.chefType)
                    const specialties = decodeChefSpecialties(chef.specialties, chef.chefType)
                    const displayName = [chef.user.firstName, chef.user.surname].filter(Boolean).join(" ") || chef.user.name

                    return (
                    <TableRow key={chef.id} className="group border-b border-border/50 transition-all duration-200 hover:bg-muted/25">
                      <TableCell className="px-5 py-5 align-top">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-sm font-semibold text-foreground shadow-sm">
                            {displayName?.charAt(0) || "C"}
                          </div>
                          <div className="min-w-0 space-y-1.5">
                            <div className="font-semibold text-foreground">{displayName}</div>
                            <div className="text-sm text-muted-foreground">{chef.user.email}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {careerStage ? (
                                <Badge variant="outline" className="rounded-full text-[11px]">
                                  {getChefCareerStageShortLabel(careerStage)}
                                </Badge>
                              ) : null}
                              {specialties.slice(0, 3).map((specialty) => (
                                <Badge key={specialty} variant="outline" className="rounded-full text-[11px]">
                                  {getChefSpecialtyLabel(specialty)}
                                </Badge>
                              ))}
                            </div>
                            {chef.bio && (
                              <div className="max-w-sm text-sm leading-6 text-muted-foreground line-clamp-2">
                                {chef.bio}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-5 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{chef.location}</div>
                            <div className="text-sm text-muted-foreground">{chef.radius}km radius</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-5 align-top">
                        <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground">
                          {chef.experience ? `${chef.experience} years` : "Not specified"}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-5 align-top">
                        <Badge variant="secondary" className="rounded-full border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
                          {chef._count.experiences} bookable services
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-5 align-top">
                        <Badge variant="secondary" className="rounded-full border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
                          {chef._count.bookings} bookings
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-5 align-top">
                        <Badge
                          variant="secondary"
                          className={
                            chef.user.isBanned || chef.isBanned
                              ? "rounded-full border-0 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : chef.isApproved
                              ? "rounded-full border-0 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "rounded-full border-0 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          }
                        >
                          {chef.user.isBanned || chef.isBanned ? "Suspended" : chef.isApproved ? "Approved" : "Pending"}
                        </Badge>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p><span className="font-medium text-foreground">Terms:</span> {chef.user.termsAcceptedAt ? `${new Date(chef.user.termsAcceptedAt).toLocaleDateString()} · ${chef.user.termsVersion ?? "current"}` : "Missing"}</p>
                          <p><span className="font-medium text-foreground">Platform insurance:</span> ChefaChef handles eligible platform bookings{chef.insuranceAcknowledgedAt ? ` · acknowledged ${new Date(chef.insuranceAcknowledgedAt).toLocaleDateString()}` : ""}</p>
                          {chef.user.isBanned || chef.isBanned ? (
                            <p><span className="font-medium text-foreground">Reason:</span> {chef.user.banReason || chef.banReason || "Not provided"}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-5 text-right align-top">
                        <div className="flex justify-end gap-2">
                          {!chef.isApproved && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(chef.id)}
                                disabled={actionLoading === chef.id}
                                className="h-9 rounded-xl bg-foreground px-3 text-background shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                              >
                                {actionLoading === chef.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Approve chef account
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(chef.id)}
                                disabled={actionLoading === chef.id}
                                className="h-9 rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                              >
                                {actionLoading === chef.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="mr-2 h-4 w-4" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-9 rounded-xl border-border/60 bg-background/80 px-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-md"
                          >
                            <Link href={`/dashboard/admin/chefs/${chef.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Review application
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
