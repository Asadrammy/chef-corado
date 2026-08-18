"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, ArrowLeft, CreditCard } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { toast } from "sonner"
import axios from "axios"

type Proposal = {
  id: string
  price: string
  currency: string
  message: string | null
  status: string
  createdAt: string
  chef: {
    name: string | null
  }
  request: {
    title: string
    eventDate: string
    location: string
  }
}

type PaymentEligibility = {
  balanceDueAt?: string
  deadlineAt?: string
}

type SplitInvite = {
  id: string
  payerEmail?: string | null
  payerName?: string | null
  amount: number
  currency: string
  status: string
  deadlineAt: string
  paymentUrl?: string | null
}

export default function ProposalPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const proposalId = searchParams.get('proposalId')
  
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [availablePlanTypes, setAvailablePlanTypes] = useState<string[]>(["FULL_PAYMENT"])
  const [paymentEligibility, setPaymentEligibility] = useState<PaymentEligibility | null>(null)
  const [planType, setPlanType] = useState("FULL_PAYMENT")
  const [splitShares, setSplitShares] = useState<Array<{ payerName: string; payerEmail: string; amount: string }>>([
    { payerName: "", payerEmail: "", amount: "" },
    { payerName: "", payerEmail: "", amount: "" },
  ])
  const [createdSplitShares, setCreatedSplitShares] = useState<SplitInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const fetchProposal = useCallback(async () => {
    if (!proposalId) {
      router.push('/dashboard/client/proposals')
      return
    }

    try {
      const response = await axios.get(`/api/proposals/${proposalId}`)
      const found = response.data?.proposal as Proposal | undefined

      if (!found) {
        toast.error("Proposal not found")
        router.push('/dashboard/client/proposals')
        return
      }

      if (!['ACCEPTED', 'ACCEPTED_PENDING_PAYMENT'].includes(found.status)) {
        toast.error('This proposal is not ready for payment')
        router.push('/dashboard/client/proposals')
        return
      }

      const validationResponse = await axios.get(`/api/payments/validate/${proposalId}`)
      const eligiblePlans = validationResponse.data?.paymentEligibility?.availablePlanTypes ?? ["FULL_PAYMENT"]
      setAvailablePlanTypes(eligiblePlans)
      setPaymentEligibility(validationResponse.data?.paymentEligibility ?? null)
      setPlanType(eligiblePlans.includes("FULL_PAYMENT") ? "FULL_PAYMENT" : eligiblePlans[0] ?? "FULL_PAYMENT")

      setProposal(found)
    } catch (error: any) {
      console.error("Error fetching proposal:", error)
      toast.error(error.response?.data?.error || "Failed to load proposal")
      router.push('/dashboard/client/proposals')
    } finally {
      setLoading(false)
    }
  }, [proposalId, router])

  useEffect(() => {
    void fetchProposal()
  }, [fetchProposal])

  const handlePayment = async () => {
    if (!proposal) return

    setProcessing(true)
    try {
      const response = await axios.post('/api/payments/checkout', {
        proposalId: proposal.id,
        planType,
        ...(planType === "SPLIT_BILL" ? {
          shareCount: splitShares.length,
          splitShares: splitShares.map((share) => ({
            payerName: share.payerName || undefined,
            payerEmail: share.payerEmail || undefined,
            amountMinor: share.amount ? Math.round(Number(share.amount) * 100) : undefined,
          })),
        } : {}),
      })

      const checkoutUrl = response.data?.data?.url ?? response.data?.url
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else if (response.data?.data?.planType === "SPLIT_BILL") {
        setCreatedSplitShares(response.data.data.splitShares ?? [])
        toast.success("Split bill invitations created.")
      } else {
        toast.error("Failed to create payment session")
      }
    } catch (error: any) {
      console.error("Payment error:", error)
      toast.error(error.response?.data?.error || "Payment failed")
    } finally {
      setProcessing(false)
    }
  }

  const proposalAmount = proposal ? Number(proposal.price) : 0
  const depositToday = Math.round(proposalAmount * 20) / 100
  const depositBalance = Math.round((proposalAmount - depositToday) * 100) / 100
  const configuredShareTotal = splitShares.reduce((sum, share) => sum + (share.amount ? Number(share.amount) || 0 : 0), 0)
  const splitAmountsConfigured = splitShares.some((share) => share.amount)
  const shareTotalMatches = !splitAmountsConfigured || Math.round(configuredShareTotal * 100) === Math.round(proposalAmount * 100)
  const updateSplitShare = (index: number, field: "payerName" | "payerEmail" | "amount", value: string) => {
    setSplitShares((prev) => prev.map((share, itemIndex) => itemIndex === index ? { ...share, [field]: value } : share))
  }
  const setShareCount = (count: number) => {
    const safeCount = Math.min(Math.max(count, 1), 20)
    setSplitShares((prev) => Array.from({ length: safeCount }, (_, index) => prev[index] ?? { payerName: "", payerEmail: "", amount: "" }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Proposal not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Complete Payment</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{proposal.request.title}</h3>
              <p className="text-sm text-muted-foreground">
                with {proposal.chef.name || "Chef"}
              </p>
            </div>
            <Badge variant={proposal.status === "ACCEPTED_PENDING_PAYMENT" ? "outline" : "default"}>
              {proposal.status.replace("_", " ")}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Event Date</span>
              <span className="text-sm font-medium">
                {new Date(proposal.request.eventDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Location</span>
              <span className="text-sm font-medium">{proposal.request.location}</span>
            </div>
          </div>

          {proposal.message && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Chef Message</p>
                <p className="text-sm text-muted-foreground">{proposal.message}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Proposal Amount</span>
            <span className="text-2xl font-bold">{formatCurrency(proposal.price, proposal.currency)}</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Payment option</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {availablePlanTypes.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={planType === type ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => setPlanType(type)}
                >
                  {type === "DEPOSIT" ? "20% Deposit" : type === "SPLIT_BILL" ? "Split Bill" : "Full Payment"}
                </Button>
              ))}
            </div>
          </div>

          {planType === "DEPOSIT" ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
              <div className="grid gap-2 sm:grid-cols-2">
                <p><span className="font-medium">Pay today:</span> {formatCurrency(depositToday, proposal.currency)}</p>
                <p><span className="font-medium">Remaining balance:</span> {formatCurrency(depositBalance, proposal.currency)}</p>
                <p className="sm:col-span-2"><span className="font-medium">Balance scheduled:</span> {paymentEligibility?.balanceDueAt ? new Date(paymentEligibility.balanceDueAt).toLocaleDateString() : "30 days before the event"}</p>
              </div>
            </div>
          ) : null}

          {planType === "SPLIT_BILL" ? (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Participants</p>
                <Input className="w-24" type="number" min={1} max={20} value={splitShares.length} onChange={(event) => setShareCount(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                {splitShares.map((share, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px]">
                    <Input placeholder={`Guest ${index + 1} name`} value={share.payerName} onChange={(event) => updateSplitShare(index, "payerName", event.target.value)} />
                    <Input placeholder="email@example.com" value={share.payerEmail} onChange={(event) => updateSplitShare(index, "payerEmail", event.target.value)} />
                    <Input placeholder="Auto" type="number" min={0} step="0.01" value={share.amount} onChange={(event) => updateSplitShare(index, "amount", event.target.value)} />
                  </div>
                ))}
              </div>
              <p className={`text-xs ${shareTotalMatches ? "text-muted-foreground" : "text-red-600"}`}>
                {splitAmountsConfigured
                  ? `Configured total: ${formatCurrency(configuredShareTotal, proposal.currency)} / ${formatCurrency(proposalAmount, proposal.currency)}`
                  : "Leave amounts blank to split the total evenly. Custom amounts must equal the booking total."}
              </p>
              <p className="text-xs text-muted-foreground">
                As the booking organizer, you remain responsible for any guest shares that are unpaid by the payment deadline.
              </p>
              {createdSplitShares.length ? (
                <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="font-medium">Invitation links</p>
                  {createdSplitShares.map((share, index) => (
                    <div key={share.id} className="break-all rounded-md border bg-background p-2">
                      <p>{share.payerEmail || `Guest ${index + 1}`} · {formatCurrency(share.amount, share.currency)}</p>
                      <p className="text-xs text-muted-foreground">{share.paymentUrl}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          
          <Separator />

          <div className="text-sm text-muted-foreground">
            <p>By proceeding with payment, you confirm the booking with the chef.</p>
            <p>Refunds are available according to our cancellation policy.</p>
          </div>

          <Button
            onClick={handlePayment}
            disabled={processing || (planType === "SPLIT_BILL" && !shareTotalMatches)}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                {planType === "DEPOSIT" ? "Pay 20% deposit" : planType === "SPLIT_BILL" ? "Create split bill" : `Pay ${formatCurrency(proposal.price, proposal.currency)}`}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
