"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import Link from "next/link"

export default function LegalAcceptancePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const redirectPath = searchParams.get("redirect") || "/dashboard"

  useEffect(() => {
    checkAcceptanceStatus()
  }, [])

  const checkAcceptanceStatus = async () => {
    try {
      const response = await axios.get("/api/account/legal-acceptance")
      if (response.data.accepted) {
        // Already accepted, redirect
        router.push(redirectPath)
      }
    } catch (error: any) {
      console.error("Failed to check acceptance status:", error)
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        router.push("/login")
        return
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!termsAccepted) {
      toast.error("Please accept the terms to continue")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await axios.put("/api/account/legal-acceptance", {
        acceptedTerms: true,
        acceptedVia: "legal_acceptance_page",
      })

      toast.success("Terms accepted successfully")
      router.push(redirectPath)
    } catch (error: any) {
      console.error("Failed to accept terms:", error)
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        router.push("/login")
        return
      }
      setError(typeof error.response?.data?.error === 'string' ? error.response.data.error : "Failed to accept terms")
      toast.error("Failed to accept terms")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Terms & Conditions Acceptance</CardTitle>
          <CardDescription>
            Please review and accept our terms to continue using the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Client Terms & Conditions</h3>
              <p className="text-sm text-gray-600 mb-3">
                By using our platform, you agree to keep all communication, booking coordination, and payments inside the platform. 
                Sharing personal contact details or arranging bookings outside the platform is not allowed.
              </p>
              <Link 
                href="/terms/client" 
                target="_blank"
                className="text-sm text-primary hover:underline"
              >
                Read full Client Terms & Conditions
              </Link>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <div className="flex-1">
                <Label htmlFor="terms" className="text-sm">
                  I have read and agree to the <Link href="/terms/client" target="_blank" className="text-primary hover:underline">Client Terms & Conditions</Link>, 
                  <Link href="/privacy" target="_blank" className="text-primary hover:underline ml-1">Privacy Policy</Link>, 
                  and understand that all communication, scheduling, and payments must remain inside the platform.
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              disabled={!termsAccepted || submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept & Continue
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            You can review our terms at any time from your account settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
