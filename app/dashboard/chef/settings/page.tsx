"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Bell, CreditCard, Loader2, Mail, Upload, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CHEF_LEGAL_ACKNOWLEDGEMENT } from "@/lib/request-options"
import { toast } from "sonner"

interface NotificationPreferences {
  emailMessages: boolean
  emailBookings: boolean
  emailRequests: boolean
  inAppMessages: boolean
  inAppBookings: boolean
  inAppRequests: boolean
}

interface ChefSettingsResponse {
  notificationPreferences: NotificationPreferences
  legal: {
    termsAcceptedAt: string | null
    termsVersion: string | null
    acceptedVia: string | null
    termsCurrent: boolean
    rightToWorkUkConfirmed: boolean
    foodHygieneLevel2Confirmed: boolean
    foodHygieneCertificateUrl: string | null
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED"
    approvedAt: string | null
    approvedBy: string | null
  }
  stripe: {
    accountId: string | null
    onboardingComplete: boolean
    isConnected: boolean
    chargesEnabled?: boolean
    payoutsEnabled?: boolean
    detailsSubmitted?: boolean
    configured?: boolean
  }
}

const preferenceGroups = [
  {
    title: "Email notifications",
    icon: Mail,
    fields: [
      { key: "emailMessages", label: "New messages" },
      { key: "emailBookings", label: "Bookings and status changes" },
      { key: "emailRequests", label: "New request opportunities" },
    ] as const,
  },
  {
    title: "In-app notifications",
    icon: Bell,
    fields: [
      { key: "inAppMessages", label: "Chat updates" },
      { key: "inAppBookings", label: "Booking activity" },
      { key: "inAppRequests", label: "Marketplace requests" },
    ] as const,
  },
]

export default function ChefSettingsPage() {
  const searchParams = useSearchParams()
  const [settings, setSettings] = useState<ChefSettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [message, setMessage] = useState("")

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/chef/settings", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Failed to fetch chef settings")
      }

      const data = (await response.json()) as ChefSettingsResponse
      setSettings(data)
    } catch (error) {
      console.error(error)
      setMessage("Failed to load settings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (!searchParams.get("stripe")) {
      return
    }

    fetchSettings()
  }, [searchParams])

  const togglePreference = (key: keyof NotificationPreferences, checked: boolean) => {
    setSettings((current) =>
      current
        ? {
            ...current,
            notificationPreferences: {
              ...current.notificationPreferences,
              [key]: checked,
            },
          }
        : current
    )
  }

  const savePreferences = async () => {
    if (!settings) return

    setSaving(true)
    setMessage("")

    try {
      const response = await fetch("/api/chef/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationPreferences: settings.notificationPreferences }),
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

      const data = await response.json()
      setSettings((current) => current ? { ...current, notificationPreferences: data.notificationPreferences } : current)
      setMessage("Notification preferences saved.")
    } catch (error) {
      console.error(error)
      setMessage("Failed to save notification preferences.")
    } finally {
      setSaving(false)
    }
  }

  const handleStripeConnect = async (action: "onboarding" | "dashboard") => {
    setConnectingStripe(true)
    setMessage("")

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle Stripe not configured error specifically
        if (errorData.code === "STRIPE_NOT_CONFIGURED") {
          setMessage("Stripe is not configured. Please add a valid STRIPE_SECRET_KEY to your .env file to enable payouts.")
          return
        }
        
        throw new Error("Failed to launch Stripe onboarding")
      }

      const data = await response.json()
      setSettings((current) => current ? { ...current, stripe: data.stripe } : current)

      if (data.url) {
        window.location.href = data.url as string
      }
    } catch (error) {
      console.error(error)
      setMessage("Failed to start Stripe onboarding.")
    } finally {
      setConnectingStripe(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="brand-surface rounded-[30px] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary shadow-sm">
            <Bell className="size-3.5" />
            Account control center
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Chef settings</h1>
          <p className="text-sm leading-6 text-muted-foreground">Manage notifications, Stripe connection, and legal status here. Use your chef profile for account details, professional information, service radius, and compliance data.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/chef/profile">Edit professional profile</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/chef/profile">Update compliance details</Link>
            </Button>
          </div>
        </div>
      </div>

      {message ? (
        <Alert>
          <AlertTitle>Settings update</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {/* Legal warning banner */}
      {settings && (!settings.legal.termsCurrent || !settings.legal.rightToWorkUkConfirmed || !settings.legal.foodHygieneLevel2Confirmed) && (
        <Alert variant="destructive">
          <AlertTitle>Legal acknowledgement required</AlertTitle>
          <AlertDescription>
            {!settings.legal.termsCurrent && "Your terms acknowledgement needs review. "}
            {!settings.legal.rightToWorkUkConfirmed && "Your right-to-work confirmation is missing. "}
            {!settings.legal.foodHygieneLevel2Confirmed && "Your Level 2 Food Hygiene confirmation is missing. "}
            Please complete the required compliance confirmations in your chef profile to maintain full platform access.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Notification preferences
            </CardTitle>
            <CardDescription>Choose how you want to hear about messages, bookings, and new opportunities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings ? (
              preferenceGroups.map((group) => (
                <div key={group.title} className="space-y-4 rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <group.icon className="size-4 text-muted-foreground" />
                    <p className="font-medium text-foreground">{group.title}</p>
                  </div>
                  <div className="space-y-4">
                    {group.fields.map((field) => (
                      <div key={field.key} className="flex items-center justify-between gap-4 rounded-2xl border border-white/50 bg-muted/20 px-4 py-3 dark:border-white/10">
                        <Label htmlFor={field.key} className="text-sm font-medium text-foreground">{field.label}</Label>
                        <Switch
                          id={field.key}
                          checked={settings.notificationPreferences[field.key]}
                          onCheckedChange={(checked) => togglePreference(field.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : null}

            <div className="flex justify-end">
              <Button type="button" onClick={savePreferences} disabled={saving} className="rounded-2xl shadow-lg shadow-primary/20">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>{saving ? "Saving..." : "Save preferences"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
        <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              Legal status
            </CardTitle>
            <CardDescription>Track your legal confirmations and approval readiness without a chef-facing insurance upload flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="font-medium text-foreground">Terms status</p>
              <p className="mt-1">{settings?.legal.termsAcceptedAt ? `Accepted ${new Date(settings.legal.termsAcceptedAt).toLocaleString()}` : "Missing acknowledgement"}</p>
              <p className="mt-1 text-xs">Version: {settings?.legal.termsVersion ?? "Not recorded"} · {settings?.legal.termsCurrent ? "Current" : "Needs review"}</p>
            </div>
            <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="font-medium text-foreground">Compliance confirmations</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Approval:</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    settings?.legal.verificationStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    settings?.legal.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {settings?.legal.verificationStatus?.toUpperCase() || 'PENDING'}
                  </span>
                </div>
                <div className="text-xs">Right to work in the UK: {settings?.legal.rightToWorkUkConfirmed ? "Confirmed" : "Missing"}</div>
                <div className="text-xs">Level 2 Food Hygiene: {settings?.legal.foodHygieneLevel2Confirmed ? "Confirmed" : "Missing"}</div>
                {settings?.legal.foodHygieneCertificateUrl ? (
                  <div className="text-xs">
                    <span>Private certificate document on file: </span>
                    <a href={settings.legal.foodHygieneCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View admin review document
                    </a>
                  </div>
                ) : null}
                {settings?.legal.approvedAt ? (
                  <div className="text-xs">
                    <span>Approved: {new Date(settings.legal.approvedAt).toLocaleString()}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="font-medium text-foreground">Where to update compliance</p>
              <p className="text-sm text-muted-foreground">
                Legal right-to-work confirmation, Level 2 Food Hygiene confirmation, and private certificate document details are managed from your chef profile.
              </p>
              <Button asChild className="w-full" size="sm">
                <Link href="/dashboard/chef/profile">Open chef profile</Link>
              </Button>
            </div>
            <div className="rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              <p>{CHEF_LEGAL_ACKNOWLEDGEMENT}</p>
              <p className="mt-2">The platform handles insurance after chef approval. Your chef profile, booking readiness, and payout access may depend on keeping your terms and compliance confirmations current.</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                <Link href="/terms/chef" className="text-foreground hover:text-primary">Chef Terms</Link>
                <Link href="/terms/client" className="text-foreground hover:text-primary">Client Terms</Link>
                <Link href="/privacy" className="text-foreground hover:text-primary">Privacy Policy</Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              Stripe connection
            </CardTitle>
            <CardDescription>Track whether your payout account is connected and ready for onboarding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings?.stripe.configured === false && (
              <Alert variant="destructive">
                <AlertTitle>Stripe not configured</AlertTitle>
                <AlertDescription>
                  Stripe payouts are not available. Please add a valid STRIPE_SECRET_KEY to your .env file to enable this feature.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-medium text-foreground">Connection status</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {settings?.stripe.isConnected ? "Stripe account connected" : "Stripe account not connected yet"}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-medium text-foreground">Onboarding</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {settings?.stripe.onboardingComplete ? "Onboarding complete" : "Onboarding still required"}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Details submitted:</span> {settings?.stripe.detailsSubmitted ? "Yes" : "No"}</p>
              <p><span className="font-medium text-foreground">Charges enabled:</span> {settings?.stripe.chargesEnabled ? "Yes" : "No"}</p>
              <p><span className="font-medium text-foreground">Payouts enabled:</span> {settings?.stripe.payoutsEnabled ? "Yes" : "No"}</p>
            </div>

            <div className="rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <CreditCard className="size-4" />
                <span className="font-medium">Payouts setup</span>
              </div>
              <p className="mt-2">Connect Stripe to receive payouts for accepted bookings. Your onboarding button now opens a live Stripe Connect flow and reflects the latest account status when you return.</p>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/chef/settings">Manage notifications</Link>
                </Button>
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full rounded-2xl border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5" disabled={connectingStripe || settings?.stripe.configured === false} onClick={() => handleStripeConnect(settings?.stripe.isConnected ? "dashboard" : "onboarding")}>
              {connectingStripe ? <Loader2 className="size-4 animate-spin" /> : null}
              {settings?.stripe.configured === false ? "Stripe not configured" : (settings?.stripe.isConnected ? "Resume Stripe onboarding" : "Connect Stripe")}
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
