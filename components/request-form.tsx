"use client"

import * as React from "react"
import { toast } from "sonner"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Calendar, MapPin, DollarSign, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormFieldWrapper } from "@/components/form-field-wrapper"
import { FormError } from "@/components/form-error"
import { LoadingSpinner } from "@/components/loading-spinner"
import { validateForm, getFieldError } from "@/lib/form-validation"
import { requestSchema } from "@/lib/validation-schemas"
import { apiClient } from "@/lib/api-client"
import { logger } from "@/lib/logger"

export function RequestForm() {
  const router = useRouter()
  const [title, setTitle] = React.useState("")
  const [eventDate, setEventDate] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [budget, setBudget] = React.useState("")
  const [details, setDetails] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [validationErrors, setValidationErrors] = React.useState<Array<{ field: string; message: string }>>([])
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const resetForm = () => {
    setTitle("")
    setEventDate("")
    setLocation("")
    setBudget("")
    setDetails("")
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
      description: details, // Optional description
      details, // Required details field (min 10 chars)
    }

    console.log("Validating form data:", formData)
    const result = validateForm(requestSchema, formData)
    
    if (!result.valid) {
      console.log("Validation errors:", result.errors)
      setValidationErrors(result.errors)
      logger.warn('Form validation failed', { errors: result.errors })
      return false
    }

    setValidationErrors([])
    return true
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    console.log("Form submission started")
    setSubmitError(null)
    setSuccess(null)

    // Validate form data
    if (!validateFormData()) {
      console.log("Form validation failed")
      toast.error("Please fix the errors below")
      return
    }

    console.log("Submitting form data:", { title, eventDate, location, budget, details })
    setLoading(true)

    try {
      logger.info('Submitting request', { title, location })

      const response = await apiClient.post('/api/requests', {
        title,
        eventDate,
        location,
        budget: Number(budget),
        description: details, // Optional description
        details: details, // Required details field (min 10 chars)
      })

      console.log("API response:", response)

      if (response.error) {
        console.log("API Error Response:", response.error)
        // Handle validation errors (array) vs simple error messages (string)
        const errorMessage = Array.isArray(response.error) 
          ? response.error.map(err => err.message || err).join(', ')
          : response.error
        throw new Error(errorMessage)
      }

      logger.info('Request created successfully')
      console.log("Request created successfully, redirecting to requests page")
      
      // Redirect to My Requests page
      router.push("/dashboard/client/requests")
      
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Failed to create request. Please try again."
      console.error("Request submission failed:", submissionError)
      logger.error('Request submission failed', submissionError)
      setSubmitError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const isFormComplete = () => {
    return title && eventDate && location && budget && details && validationErrors.length === 0
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <form onSubmit={handleSubmit} className="lg:col-span-12 space-y-8">
        {/* LEFT COLUMN - Premium Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Event Basics Card */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Event Basics</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <FormFieldWrapper
                  label="Event Date"
                  error={getFieldError(validationErrors, 'eventDate')}
                  required
                >
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                    className="h-12 rounded-xl border-gray-200 bg-white px-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                    disabled={loading}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </FormFieldWrapper>
                <FormFieldWrapper
                  label="Location"
                  error={getFieldError(validationErrors, 'location')}
                  required
                >
                  <Input
                    id="location"
                    placeholder="Venue or city"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="h-12 rounded-xl border-gray-200 bg-white px-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                    disabled={loading}
                  />
                </FormFieldWrapper>
              </div>
            </section>

            {/* Budget Card */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-gray-100 rounded-lg p-3">
                  <DollarSign className="w-5 h-5 text-indigo-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Budget</h2>
              </div>
              <FormFieldWrapper
                label="Total Budget"
                error={getFieldError(validationErrors, 'budget')}
                required
              >
                <Input
                  id="budget"
                  type="number"
                  min={1}
                  step="0.01"
                  placeholder="Enter amount"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  className="h-12 rounded-xl border-gray-200 bg-white px-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  disabled={loading}
                />
              </FormFieldWrapper>
            </section>

            {/* Event Details Card */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-gray-100 rounded-lg p-3">
                  <FileText className="w-5 h-5 text-indigo-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
              </div>
              <div className="space-y-6">
                <FormFieldWrapper
                  label="Request Title"
                  error={getFieldError(validationErrors, 'title')}
                  required
                >
                  <Input
                    id="title"
                    placeholder="E.g. Intimate birthday dinner for 12"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-12 rounded-xl border-gray-200 bg-white px-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                    disabled={loading}
                  />
                </FormFieldWrapper>
                <FormFieldWrapper
                  label="Details"
                  error={getFieldError(validationErrors, 'details')}
                  required
                >
                  <Textarea
                    id="details"
                    placeholder="Describe your vision, guest count, dietary needs, cuisine preferences..."
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    className="min-h-[140px] rounded-xl p-4 border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 resize-none"
                    disabled={loading}
                  />
                </FormFieldWrapper>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN - Premium Summary */}
          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-8 space-y-8">
              {/* Enhanced Summary Card */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-md p-8 divide-y divide-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Request Summary</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-gray-500">Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {eventDate ? new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-gray-500">Location</span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {location || "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-gray-500">Budget</span>
                    <span className="text-sm font-medium text-gray-900">
                      {budget ? `$${Number(budget).toLocaleString()}` : "Not set"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Premium CTA Card */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <FormError message={submitError} />
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || validationErrors.length > 0 || !isFormComplete()}
                  className="w-full h-12 bg-black text-white rounded-xl font-semibold hover:scale-[1.03] hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span>Posting...</span>
                    </div>
                  ) : (
                    "Get proposals"
                  )}
                </Button>

                {validationErrors.length > 0 && (
                  <p className="mt-3 text-xs text-red-600">
                    Please fix {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''} above
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
