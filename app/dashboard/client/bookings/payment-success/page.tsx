"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import { formatCurrency } from "@/lib/currency"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verifying, setVerifying] = useState(true)
  const [booking, setBooking] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    verifyPaymentCompletion()
  }, [])

  const verifyPaymentCompletion = async () => {
    try {
      const sessionId = searchParams.get('session_id')
      const paymentIntentId = searchParams.get('payment_intent_id')

      if (!sessionId && !paymentIntentId) {
        setError('Missing payment verification identifiers')
        setVerifying(false)
        return
      }

      const verifyUrl = sessionId 
        ? `/api/payments/verify?session_id=${sessionId}`
        : `/api/payments/verify?payment_intent_id=${paymentIntentId}`

      const verifyResponse = await axios.get(verifyUrl)

      if (verifyResponse.data.verified) {
        setBooking(verifyResponse.data.booking)
        if (verifyResponse.data.reconciled) {
          toast.info('Payment reconciled from Stripe - booking created')
        } else {
          toast.success('Payment completed successfully!')
        }
      } else {
        setError(verifyResponse.data.error || 'Payment verification failed')
      }
      
    } catch (error: any) {
      console.error('Payment verification error:', error)
      setError(error.response?.data?.error || 'Payment verification failed')
    } finally {
      setVerifying(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment...</h2>
          <p className="text-gray-600">Please wait while we confirm your booking.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-red-600">Payment Issue</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/client/bookings')}
                className="w-full"
              >
                View Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-green-600">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-gray-900 font-semibold">Booking Confirmed</p>
            <p className="text-gray-600 text-sm">
              Your booking has been successfully created and confirmed.
            </p>
            {booking && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                <p className="text-sm font-medium text-gray-900">Booking Details:</p>
                <p className="text-xs text-gray-600">ID: {booking.id}</p>
                <p className="text-xs text-gray-600">Amount: {formatCurrency(booking.payments?.totalAmount || 0, booking.currency || 'GBP')}</p>
                <p className="text-xs text-gray-600">Status: {booking.status}</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Button 
              onClick={() => router.push('/dashboard/client/bookings')}
              className="w-full"
            >
              View My Bookings
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
