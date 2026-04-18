"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verifying, setVerifying] = useState(true)
  const [booking, setBooking] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    verifyPaymentCompletion()
  }, [])

  // 🔴 P0 FIX #4: ENHANCED WEBHOOK DELAY HANDLING WITH POLLING
  const pollBookingConfirmation = async (proposalId: string): Promise<any> => {
    const maxAttempts = 90 // 90 attempts * 2 seconds = 3 minutes max wait
    let lastError: any = null
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const bookingResponse = await axios.get(`/api/bookings/by-proposal/${proposalId}`)
        
        if (bookingResponse.data?.booking) {
          const booking = bookingResponse.data.booking
          
          // Check if payment is confirmed and booking is ready
          if (booking.payments?.status === 'PAID' && booking.status === 'CONFIRMED') {
            // Additional verification
            const verifyResponse = await axios.get(`/api/bookings/${booking.id}/verify`)
            
            if (verifyResponse.data.verified) {
              return verifyResponse.data.booking
            }
          }
        }
        
        // If not ready, wait before next attempt
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        }
        
      } catch (error) {
        lastError = error
        console.error(`Polling attempt ${attempt + 1} failed:`, error)
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }
    
    // After polling timeout, try reconciliation one more time
    try {
      console.log('Polling timeout, attempting reconciliation...')
      const reconcileResponse = await axios.post('/api/admin/reconciliation/manual', {
        proposalId
      })
      
      if (reconcileResponse.data.success) {
        // Try one final booking check
        const finalCheckResponse = await axios.get(`/api/bookings/by-proposal/${proposalId}`)
        
        if (finalCheckResponse.data?.booking?.payments?.status === 'PAID') {
          const verifyResponse = await axios.get(`/api/bookings/${finalCheckResponse.data.booking.id}/verify`)
          
          if (verifyResponse.data.verified) {
            return verifyResponse.data.booking
          }
        }
      }
    } catch (reconcileError) {
      console.error('Reconciliation attempt failed:', reconcileError)
    }
    
    throw new Error('Booking confirmation timeout. Payment may have succeeded but processing is delayed. Please check your bookings in a few minutes or contact support.')
  }

  const verifyPaymentCompletion = async () => {
    try {
      // CRITICAL: Get proposal ID from session storage
      const proposalId = sessionStorage.getItem('pendingProposalId')
      
      if (!proposalId) {
        setError('No payment session found')
        setVerifying(false)
        return
      }

      // 🔴 P0 FIX #4: POLL FOR BOOKING CONFIRMATION
      // This handles webhook delays by polling until booking is ready
      try {
        const confirmedBooking = await pollBookingConfirmation(proposalId)
        setBooking(confirmedBooking)
        sessionStorage.removeItem('pendingProposalId')
        toast.success('Payment completed successfully!')
      } catch (pollingError) {
        console.error('Polling failed:', pollingError)
        
        // Fallback: Try direct check one more time
        try {
          const bookingResponse = await axios.get(`/api/bookings/by-proposal/${proposalId}`)
          
          if (bookingResponse.data?.booking) {
            const booking = bookingResponse.data.booking
            
            if (booking.payments?.status === 'PAID' && booking.status === 'CONFIRMED') {
              const verifyResponse = await axios.get(`/api/bookings/${booking.id}/verify`)
              
              if (verifyResponse.data.verified) {
                setBooking(verifyResponse.data.booking)
                sessionStorage.removeItem('pendingProposalId')
                toast.success('Payment completed successfully!')
                return
              }
            }
          }
        } catch (fallbackError) {
          console.error('Fallback check failed:', fallbackError)
        }
        
        setError(pollingError instanceof Error ? pollingError.message : 'Payment verification failed')
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
                <p className="text-xs text-gray-600">Amount: ${booking.payments?.totalAmount || 'N/A'}</p>
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
