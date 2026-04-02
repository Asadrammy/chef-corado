"use client"

import * as React from "react"
import { toast } from "sonner"
import { z } from "zod"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormFieldWrapper } from "@/components/form-field-wrapper"
import { FormError } from "@/components/form-error"
import { LoadingSpinner } from "@/components/loading-spinner"
import { apiClient } from "@/lib/api-client"
import { logger } from "@/lib/logger"
import { growthAnalytics } from "@/lib/analytics"
import { DollarSign, MessageSquare, Clock, Star, Zap, CheckCircle } from "lucide-react"

interface OptimizedProposalFormProps {
  requestId: string
  requestData: {
    title?: string
    location: string
    budget: number
    eventDate: string
    details?: string
  }
}

export function OptimizedProposalForm({ requestId, requestData }: OptimizedProposalFormProps) {
  const router = useRouter()
  const [price, setPrice] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  // Quick price suggestions based on budget
  const getPriceSuggestions = () => {
    const budget = requestData.budget
    const suggestions = [
      { label: "Match Budget", value: budget },
      { label: "Slightly Under", value: Math.round(budget * 0.9) },
      { label: "Premium (+20%)", value: Math.round(budget * 1.2) }
    ]
    return suggestions
  }

  // Quick message templates
  const getMessageTemplates = () => {
    const templates = [
      {
        name: "Enthusiastic",
        text: "I'm excited about your event! I have extensive experience creating memorable culinary experiences and would love to work with you."
      },
      {
        name: "Professional", 
        text: "I specialize in events like yours and can deliver an exceptional dining experience that exceeds your expectations."
      },
      {
        name: "Detailed",
        text: "Based on your requirements, I can create a customized menu that perfectly matches your vision. Let's discuss the details."
      }
    ]
    return templates
  }

  const resetForm = () => {
    setPrice("")
    setMessage("")
    setSubmitError(null)
    setSuccess(null)
  }

  const applyPriceSuggestion = (suggestedPrice: number) => {
    setPrice(suggestedPrice.toString())
  }

  const applyMessageTemplate = (template: string) => {
    setMessage(template)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSuccess(null)

    // Basic validation
    if (!price || Number(price) <= 0) {
      toast.error("Please enter a valid price")
      return
    }

    if (!message || message.length < 10) {
      toast.error("Please include a message (min 10 characters)")
      return
    }

    setLoading(true)

    try {
      logger.info('Submitting optimized proposal', { requestId, price })

      const response = await apiClient.post('/api/proposals', {
        requestId,
        price: Number(price),
        message,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      logger.info('Proposal submitted successfully')
      
      // Track proposal submission
      growthAnalytics.track('proposal_sent', (response.data as any)?.id, {
        userRole: 'CHEF',
        requestId,
        price: Number(price),
        budget: requestData.budget,
        priceMatch: Number(price) === requestData.budget,
        responseTime: Date.now()
      })

      setSuccess("Proposal sent! The client will be notified immediately.")
      toast.success("Proposal submitted successfully!")
      
      // Redirect to proposals page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/chef/proposals')
      }, 2000)

    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Failed to submit proposal. Please try again."
      logger.error('Proposal submission failed', submissionError)
      setSubmitError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const priceSuggestions = getPriceSuggestions()
  const messageTemplates = getMessageTemplates()
  const isFormValid = price && message && message.length >= 10

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Request Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-blue-600" />
            Event Request Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Location:</span>
              <p className="font-medium">{requestData.location}</p>
            </div>
            <div>
              <span className="text-gray-600">Budget:</span>
              <p className="font-medium text-green-600">${requestData.budget}</p>
            </div>
            <div>
              <span className="text-gray-600">Date:</span>
              <p className="font-medium">{new Date(requestData.eventDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-600">Type:</span>
              <p className="font-medium">{requestData.title || 'Event'}</p>
            </div>
          </div>
          {requestData.details && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <span className="text-gray-600 text-sm">Client Details:</span>
              <p className="text-sm mt-1">{requestData.details}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Price Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Your Price
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {priceSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.label}
                  type="button"
                  variant={price === suggestion.value.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPriceSuggestion(suggestion.value)}
                  className="text-xs"
                >
                  {suggestion.label}: ${suggestion.value}
                </Button>
              ))}
            </div>
            
            <FormFieldWrapper
              label="Your Price"
              helperText="Total amount you'll charge for this event"
            >
              <Input
                id="price"
                type="number"
                min={1}
                step="10"
                placeholder="Enter your price"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="h-11 text-lg font-semibold"
                disabled={loading}
              />
            </FormFieldWrapper>

            {price && Number(price) > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Badge className={Number(price) === requestData.budget ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                  {Number(price) === requestData.budget 
                    ? "Matches budget perfectly!" 
                    : Number(price) > requestData.budget 
                      ? `+$${Number(price) - requestData.budget} over budget`
                      : `$${requestData.budget - Number(price)} under budget`
                  }
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Your Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {messageTemplates.map((template) => (
                <Button
                  key={template.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyMessageTemplate(template.text)}
                  className="text-xs"
                >
                  {template.name}
                </Button>
              ))}
            </div>

            <FormFieldWrapper
              label="Message to Client"
              helperText="Introduce yourself and explain why you're perfect for this event"
            >
              <Textarea
                id="message"
                placeholder="Tell the client why you're the right chef for their event..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-[120px]"
                disabled={loading}
              />
            </FormFieldWrapper>

            <div className="text-xs text-gray-500">
              {message.length}/10 characters minimum
            </div>
          </CardContent>
        </Card>

        {/* Success/Error Messages */}
        {submitError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <FormError message={submitError} />
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{success}</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                The client can now review and accept your proposal.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Sending Proposal...</span>
                  </div>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Send Proposal - Get This Booking!
                  </>
                )}
              </Button>
              
              {!isFormValid && (
                <p className="text-sm text-gray-500 text-center">
                  Add your price and message to send proposal
                </p>
              )}
              
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Client notified immediately</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>Fast responses get more bookings</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
