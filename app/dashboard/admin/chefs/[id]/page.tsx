"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Award, CheckCircle, ChefHat, FileText, Loader2, MapPin, ShieldCheck, XCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  decodeChefSpecialties,
  getChefCareerStageLabel,
  getChefSpecialtyLabel,
  normalizeChefCareerStage,
} from "@/lib/chef-onboarding-options"

type AdminChefReview = {
  id: string
  bio?: string | null
  profileImage?: string | null
  experience?: number | null
  location?: string | null
  radius?: number | null
  cuisineType?: string | null
  certifications?: string | null
  careerStage?: string | null
  specialties?: string | null
  chefType?: string | null
  verificationStatus?: string | null
  isApproved: boolean
  rightToWorkUkConfirmed?: boolean | null
  foodHygieneLevel2Confirmed?: boolean | null
  foodHygieneCertificateUrl?: string | null
  foodHygieneCertificateUploadedAt?: string | null
  foodHygieneCertificateReviewStatus?: string | null
  reviewNotes?: string | null
  reviewedAt?: string | null
  reviewedBy?: string | null
  approvedAt?: string | null
  approvedBy?: string | null
  user: {
    id: string
    name: string
    firstName?: string | null
    surname?: string | null
    email: string
    phone?: string | null
    verified?: boolean
    isBanned?: boolean
    banReason?: string | null
    termsAcceptedAt?: string | null
    termsVersion?: string | null
    createdAt: string
  }
  experiences: Array<{ id: string; title: string; isActive: boolean; price: number; currency: string }>
  menus: Array<{ id: string; title: string; cuisineType?: string | null; eventType?: string | null; menuImage?: string | null }>
  backgroundChecks: Array<{ id: string; status: string; checkType: string; createdAt: string; internalNotes?: string | null }>
  auditLogs: Array<{ id: string; action: string; reason?: string | null; performedBy?: string | null; createdAt: string }>
  _count: {
    bookings: number
    reviews: number
    experiences: number
    menus: number
  }
}

function getSafeCertificateHref(value?: string | null) {
  if (!value) return null
  if (value.startsWith("/api/chef/certificates/")) return value

  try {
    const url = new URL(value)
    return url.protocol === "https:" ? value : null
  } catch {
    return null
  }
}

export default function AdminChefReviewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [chef, setChef] = useState<AdminChefReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [reason, setReason] = useState("")

  const fetchChef = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/chefs/${params.id}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load chef application")
      }
      setChef(payload.chef)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load chef application")
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchChef()
  }, [fetchChef])

  const submitReview = async (action: "APPROVE" | "REJECT" | "CHANGES_REQUESTED") => {
    setActionLoading(action)
    setError("")
    setSuccess("")
    try {
      const response = await fetch(`/api/admin/chefs/${params.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason || undefined }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to update chef review")
      }
      setSuccess("Chef review updated successfully")
      setReason("")
      await fetchChef()
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Failed to update chef review")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!chef) {
    return (
      <Alert>
        <AlertDescription>{error || "Chef application not found"}</AlertDescription>
      </Alert>
    )
  }

  const displayName = [chef.user.firstName, chef.user.surname].filter(Boolean).join(" ") || chef.user.name
  const certificateHref = getSafeCertificateHref(chef.foodHygieneCertificateUrl)
  const careerStage = normalizeChefCareerStage(chef.careerStage, chef.chefType)
  const specialties = decodeChefSpecialties(chef.specialties, chef.chefType)
  const status = chef.verificationStatus ?? (chef.isApproved ? "APPROVED" : "PENDING")
  const readiness = [
    { label: "Identity", complete: Boolean(displayName && chef.user.email) },
    { label: "Email verification", complete: Boolean(chef.user.verified) },
    { label: "Profile photo", complete: Boolean(chef.profileImage) },
    { label: "Professional summary", complete: Boolean(chef.bio) },
    { label: "Career stage", complete: Boolean(careerStage) },
    { label: "Specialties", complete: specialties.length > 0 },
    { label: "Right to work", complete: Boolean(chef.rightToWorkUkConfirmed) },
    { label: "Food hygiene Level 2", complete: Boolean(chef.foodHygieneLevel2Confirmed) },
    { label: "Certificate uploaded", complete: Boolean(chef.foodHygieneCertificateUrl) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/chefs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chef Management
          </Link>
        </Button>
        <Badge variant={status === "APPROVED" ? "default" : status === "REJECTED" ? "destructive" : "secondary"} className="w-fit">
          {status === "CHANGES_REQUESTED" ? "Changes requested" : status.toLowerCase().replace("_", " ")}
        </Badge>
      </div>

      {success ? (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-2xl">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Avatar className="h-32 w-32 rounded-2xl">
              <AvatarImage src={chef.profileImage || undefined} />
              <AvatarFallback className="text-4xl">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{displayName}</h1>
              <p className="text-sm text-muted-foreground">{chef.user.email}</p>
              {chef.user.phone ? <p className="text-sm text-muted-foreground">{chef.user.phone}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard icon={<MapPin className="h-5 w-5" />} label="Location" value={`${chef.location ?? "Not provided"}${chef.radius ? ` · ${chef.radius}km` : ""}`} />
            <InfoCard icon={<ChefHat className="h-5 w-5" />} label="Career stage" value={getChefCareerStageLabel(careerStage)} />
            <InfoCard icon={<Award className="h-5 w-5" />} label="Years of Experience" value={chef.experience != null ? `${chef.experience} years` : "Not specified"} />
            <InfoCard icon={<ShieldCheck className="h-5 w-5" />} label="Chef account approval" value={chef.isApproved ? "Approved" : status === "CHANGES_REQUESTED" ? "Changes requested" : status === "REJECTED" ? "Rejected" : "Pending approval"} />
            <InfoCard icon={<ShieldCheck className="h-5 w-5" />} label="Email verification" value={chef.user.verified ? "Verified" : "Not verified"} />
            <InfoCard icon={<FileText className="h-5 w-5" />} label="Food Hygiene evidence" value={`${chef.foodHygieneCertificateReviewStatus ?? (chef.foodHygieneCertificateUrl ? "PENDING" : "MISSING")}${chef.foodHygieneCertificateUrl ? " · uploaded" : ""}`} />
            <InfoCard icon={<ShieldCheck className="h-5 w-5" />} label="Review readiness" value={`${readiness.filter((item) => item.complete).length}/${readiness.length} complete`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Professional summary</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{chef.bio || "No bio provided."}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Chef specialties</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {specialties.length > 0 ? specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline">{getChefSpecialtyLabel(specialty)}</Badge>
                  )) : <span className="text-sm text-muted-foreground">Not specified</span>}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Cuisine focus</h3>
                <p className="mt-2 text-sm">{chef.cuisineType || "Not specified"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Additional certifications</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{chef.certifications || "Not provided."}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bookable Services & Menus</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <ListBlock title="Bookable services" empty="No bookable services yet." items={chef.experiences.map((item) => `${item.title} · ${item.isActive ? "Active" : "Inactive"}`)} />
              <ListBlock title="Menus" empty="No menus yet." items={chef.menus.map((item) => `${item.title}${item.cuisineType ? ` · ${item.cuisineType}` : ""}`)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chef.auditLogs.length > 0 ? chef.auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl border p-3 text-sm">
                  <div className="font-medium">{log.action}</div>
                  <div className="mt-1 text-muted-foreground">{new Date(log.createdAt).toLocaleString()} · {log.performedBy || "System"}</div>
                  {log.reason ? <div className="mt-2 text-muted-foreground">{log.reason}</div> : null}
                </div>
              )) : <p className="text-sm text-muted-foreground">No audit history yet.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Review</CardTitle>
              <p className="text-sm text-muted-foreground">Food Hygiene evidence, chef account approval, and email verification are tracked separately. Admin approval here does not modify the user email verification flag.</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {readiness.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border p-3">
                  <span>{item.label}</span>
                  {item.complete ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                </div>
              ))}
              {certificateHref ? (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={certificateHref} target="_blank" rel="noreferrer">
                    <FileText className="mr-2 h-4 w-4" />
                    View food hygiene certificate
                  </Link>
                </Button>
              ) : chef.foodHygieneCertificateUrl ? (
                <Alert>
                  <AlertDescription>Certificate reference is not viewable. Ask the chef to re-upload the private certificate.</AlertDescription>
                </Alert>
              ) : null}
              <ListBlock
                title="Background checks"
                empty="No background checks recorded."
                items={chef.backgroundChecks.map((check) => `${check.checkType}: ${check.status}`)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {chef.reviewNotes ? (
                <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                  <div className="font-medium">Last admin note</div>
                  <p className="mt-1 text-muted-foreground">{chef.reviewNotes}</p>
                </div>
              ) : null}
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Optional admin note for audit history and chef notification"
                className="min-h-28"
              />
              <div className="grid gap-2">
                <Button onClick={() => submitReview("APPROVE")} disabled={Boolean(actionLoading)}>
                  {actionLoading === "APPROVE" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Approve chef account
                </Button>
                <Button variant="outline" onClick={() => submitReview("CHANGES_REQUESTED")} disabled={Boolean(actionLoading)}>
                  {actionLoading === "CHANGES_REQUESTED" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Request changes
                </Button>
                <Button variant="destructive" onClick={() => submitReview("REJECT")} disabled={Boolean(actionLoading)}>
                  {actionLoading === "REJECT" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Reject
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => router.refresh()}>
                Refresh review data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  )
}

function ListBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item} className="rounded-lg border bg-background px-3 py-2 text-sm">{item}</div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}
