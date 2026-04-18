"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Bell, CreditCard, Loader2, Mail, Wallet } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

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

  const handleStripeConnect = async (action: "onboard" | "refresh") => {
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
      <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary shadow-sm">
            <Bell className="size-3.5" />
            Account control center
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Chef settings</h1>
          <p className="text-sm leading-6 text-muted-foreground">Manage notifications, payout readiness, and account preferences from a cleaner premium workspace.</p>
        </div>
      </div>

      {message ? (
        <Alert>
          <AlertTitle>Settings update</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

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
            </div>

            <Button type="button" variant="outline" className="w-full rounded-2xl border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5" disabled={connectingStripe || settings?.stripe.configured === false} onClick={() => handleStripeConnect(settings?.stripe.isConnected ? "refresh" : "onboard")}>
              {connectingStripe ? <Loader2 className="size-4 animate-spin" /> : null}
              {settings?.stripe.configured === false ? "Stripe not configured" : (settings?.stripe.isConnected ? "Resume Stripe onboarding" : "Connect Stripe")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
