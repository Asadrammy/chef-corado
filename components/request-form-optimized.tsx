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
import { validateForm, getFieldError } from "@/lib/form-validation"
import { requestSchema } from "@/lib/validation-schemas"
import { apiClient } from "@/lib/api-client"
import { logger } from "@/lib/logger"
import { growthAnalytics } from "@/lib/analytics"
import { Calendar, MapPin, DollarSign, Users, Clock, Star } from "lucide-react"

export function OptimizedRequestForm() {
  const router = useRouter()
  const [title, setTitle] = React.useState("")
  const [eventDate, setEventDate] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [budget, setBudget] = React.useState("")
  const [details, setDetails] = React.useState("")
  const [guestCount, setGuestCount] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [validationErrors, setValidationErrors] = React.useState<Array<{ field: string; message: string }>>([])
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  // Quick templates for common events
  const quickTemplates = [
    {
      name: "Birthday Dinner",
      title: "Birthday dinner for friends",
      details: "Celebrating a birthday with close friends. Looking for a memorable dining experience."
    },
    {
      name: "Anniversary",
      title: "Romantic anniversary dinner",
      details: "Special anniversary celebration. Intimate setting, romantic atmosphere preferred."
    },
    {
      name: "Corporate Event",
      title: "Corporate team dinner",
      details: "Team building dinner for our company. Professional service, good for networking."
    },
    {
      name: "Family Gathering",
      title: "Family celebration dinner",
      details: "Family get-together celebration. Kid-friendly options appreciated."
    }
  ]

  const resetForm = () => {
    setTitle("")
    setEventDate("")
    setLocation("")
    setBudget("")
    setDetails("")
    setGuestCount("")
    setValidationErrors([])
    setSubmitError(null)
    setSuccess(null)
  }

  const validateFormData = () => {
    const formData = {
      title,
      eventDate,
      location,
      budget: budget ? Number(budget) : undefined,
      details,
    }

    const result = validateForm(requestSchema, formData)
    
    if (!result.valid) {
      setValidationErrors(result.errors)
      logger.warn('Form validation failed', { errors: result.errors })
      return false
    }

    setValidationErrors([])
    return true
  }

  const applyTemplate = (template: any) => {
    setTitle(template.title)
    setDetails(template.details)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSuccess(null)

    // Validate form data
    if (!validateFormData()) {
      toast.error("Please fix the errors below")
      return
    }

    setLoading(true)

    try {
      logger.info('Submitting optimized request', { title, location, guestCount })

      const response = await apiClient.post('/api/requests', {
        title,
        eventDate,
        location,
        budget: Number(budget),
        details: guestCount ? `${details}\n\nGuest count: ${guestCount}` : details,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      logger.info('Request created successfully')
      
      // Track request creation milestone
      growthAnalytics.track('request_created', (response.data as any)?.id, {
        userRole: 'CLIENT',
        budget: Number(budget),
        eventDate,
        location,
        hasGuestCount: !!guestCount
      })

      setSuccess("Request created! Chefs in your area will see this immediately.")
      toast.success("Request submitted successfully - you'll get proposals soon!")
      
      // Redirect to proposals page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/client/proposals')
      }, 2000)

    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Failed to create request. Please try again."
      logger.error('Request submission failed', submissionError)
      setSubmitError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const getTitleError = getFieldError(validationErrors, 'title')
  const getEventDateError = getFieldError(validationErrors, 'eventDate')
  const getLocationError = getFieldError(validationErrors, 'location')
  const getBudgetError = getFieldError(validationErrors, 'budget')
  const getDetailsError = getFieldError(validationErrors, 'details')

  const isFormValid = title && eventDate && location && budget && details

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickTemplates.map((template) => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(template)}
                className="text-xs"
              >
                {template.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Essential Info - Top Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Essential Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormFieldWrapper
                label="Event Date"
                error={getEventDateError}
                required
              >
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="h-11"
                  disabled={loading}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormFieldWrapper>
              
              <FormFieldWrapper
                label="Budget"
                error={getBudgetError}
                required
                helperText="Total budget for the event"
              >
                <Input
                  id="budget"
                  type="number"
                  min={50}
                  step="50"
                  placeholder="e.g., 500"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  className="h-11"
                  disabled={loading}
                />
              </FormFieldWrapper>
            </div>

            <FormFieldWrapper
              label="Location"
              error={getLocationError}
              required
            >
              <Input
                id="location"
                placeholder="City or venue address"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="h-11"
                disabled={loading}
              />
            </FormFieldWrapper>

            <FormFieldWrapper
              label="Guest Count (Optional)"
              helperText="Helps chefs prepare better"
            >
              <Input
                id="guestCount"
                type="number"
                min={1}
                max={100}
                placeholder="e.g., 8 guests"
                value={guestCount}
                onChange={(event) => setGuestCount(event.target.value)}
                className="h-11"
                disabled={loading}
              />
            </FormFieldWrapper>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What's the occasion?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormFieldWrapper
              label="Event Title"
              error={getTitleError}
              required
              helperText="Brief description - chefs see this first"
            >
              <Input
                id="title"
                placeholder="e.g., Birthday dinner for 8 friends"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11"
                disabled={loading}
              />
            </FormFieldWrapper>

            <FormFieldWrapper
              label="Event Details"
              error={getDetailsError}
              required
              helperText="Cuisine preferences, dietary needs, atmosphere, anything important"
            >
              <Textarea
                id="details"
                placeholder="e.g., Italian dinner, vegetarian options, romantic atmosphere, anniversary celebration..."
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                className="min-h-[100px]"
                disabled={loading}
              />
            </FormFieldWrapper>
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
                <Star className="w-5 h-5" />
                <span className="font-medium">{success}</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Check your proposals page in a few minutes!
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
                    <span>Creating Request...</span>
                  </div>
                ) : (
                  "Post Request - Get Proposals Fast"
                )}
              </Button>
              
              {!isFormValid && (
                <p className="text-sm text-gray-500 text-center">
                  Fill in all required fields to post your request
                </p>
              )}
              
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Usually get proposals within 2 hours</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Seen by qualified chefs in your area</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
