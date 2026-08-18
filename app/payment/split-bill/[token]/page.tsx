"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import { CalendarDays, CreditCard, MapPin } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"

type ShareDetails = {
  id: string
  amount: number
  currency: string
  status: string
  paid: boolean
  expired: boolean
  deadlineAt: string
  event: {
    title: string
    date: string
    location: string
    chefName: string | null
  }
}

type ApiEnvelope<T> = {
  success: boolean
  data?: T
  error?: { message: string }
}

export default function SplitBillSharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [share, setShare] = useState<ShareDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    const loadShare = async () => {
      try {
        const response = await fetch(`/api/payments/split-shares/${token}`, { cache: "no-store" })
        const payload = (await response.json()) as ApiEnvelope<ShareDetails>
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.message || "Unable to load this split bill share")
        }
        setShare(payload.data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load this split bill share")
      } finally {
        setLoading(false)
      }
    }

    void loadShare()
  }, [token])

  const startPayment = async () => {
    setPaying(true)
    try {
      const response = await fetch(`/api/payments/split-shares/${token}/checkout`, {
        method: "POST",
        cache: "no-store",
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Unable to create checkout")
      }
      if (payload.data?.url) {
        window.location.href = payload.data.url
        return
      }
      toast.info(payload.data?.message || "This share is not payable right now.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create checkout")
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6 text-muted-foreground">Loading split bill share...</div>
  }

  if (!share) {
    return <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6 text-center text-muted-foreground">This split bill link could not be loaded.</div>
  }

  const disabled = share.paid || share.expired || paying

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center p-6">
      <Card className="w-full rounded-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>ChefaChef Split Bill</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Pay your allocated share securely through Stripe.</p>
            </div>
            <Badge variant={share.paid ? "default" : share.expired ? "destructive" : "outline"}>
              {share.paid ? "Paid" : share.expired ? "Expired" : "Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-950">
            <p className="text-sm font-medium">Your share</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(share.amount, share.currency)}</p>
            <p className="mt-1 text-xs">Deadline: {new Date(share.deadlineAt).toLocaleDateString()}</p>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{share.event.title} · {new Date(share.event.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{share.event.location}</span>
            </div>
          </div>

          <Button className="w-full" disabled={disabled} onClick={() => void startPayment()}>
            <CreditCard className="mr-2 h-4 w-4" />
            {share.paid ? "Share Paid" : share.expired ? "Link Expired" : paying ? "Creating Checkout..." : `Pay ${formatCurrency(share.amount, share.currency)}`}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
