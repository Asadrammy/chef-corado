"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
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

export default function ProposalPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const proposalId = searchParams.get('proposalId')
  
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!proposalId) {
      router.push('/dashboard/client/proposals')
      return
    }

    fetchProposal()
  }, [proposalId, router])

  const fetchProposal = async () => {
    try {
      // CRITICAL: Fetch single proposal instead of all proposals
      const response = await axios.get(`/api/proposals/${proposalId}`)
      const proposal = response.data.proposal
      
      if (!proposal) {
        toast.error("Proposal not found")
        router.push('/dashboard/client/proposals')
        return
      }

      // CRITICAL: Validate proposal is ready for payment
      const validationResponse = await axios.get(`/api/payments/validate/${proposalId}`)
      if (!validationResponse.data.valid) {
        toast.error(validationResponse.data.error || "Proposal not ready for payment")
        router.push('/dashboard/client/proposals')
        return
      }

      setProposal(proposal)
    } catch (error) {
      console.error("Error fetching proposal:", error)
      toast.error("Failed to load proposal")
      router.push('/dashboard/client/proposals')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!proposal) return

    setProcessing(true)
    try {
      const response = await axios.post('/api/payments/checkout', {
        proposalId: proposal.id
      })

      if (response.data.url) {
        // CRITICAL: Store proposal ID for post-payment verification
        sessionStorage.setItem('pendingProposalId', proposal.id)
        window.location.href = response.data.url
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
                <p className="text-sm font-medium mb-2">Chef's Message</p>
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
          
          <Separator />

          <div className="text-sm text-muted-foreground">
            <p>By proceeding with payment, you confirm the booking with the chef.</p>
            <p>Refunds are available according to our cancellation policy.</p>
          </div>

          <Button
            onClick={handlePayment}
            disabled={processing}
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
                Pay {formatCurrency(proposal.price, proposal.currency)}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
