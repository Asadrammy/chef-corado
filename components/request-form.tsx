"use client"

import * as React from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, MapPin, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

  const validateFormData = React.useCallback(() => {
    const formData = {
      title,
      eventDate,
      location,
      budget: budget ? Number(budget) : undefined,
      description: details,
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
  }, [budget, details, eventDate, location, title])

  const fieldIds = {
    title: "request-title",
    eventDate: "request-event-date",
    location: "request-location",
    budget: "request-budget",
    details: "request-details",
  }

  const fieldErrors = React.useMemo(
    () => ({
      title: getFieldError(validationErrors, "title"),
      eventDate: getFieldError(validationErrors, "eventDate"),
      location: getFieldError(validationErrors, "location"),
      budget: getFieldError(validationErrors, "budget"),
      details: getFieldError(validationErrors, "details"),
    }),
    [validationErrors]
  )

  const fields = React.useMemo(
    () => [
      { key: "title", label: "Title", value: title },
      { key: "eventDate", label: "Event date", value: eventDate },
      { key: "location", label: "Location", value: location },
      { key: "budget", label: "Budget", value: budget },
      { key: "details", label: "Details", value: details },
    ],
    [budget, details, eventDate, location, title]
  )

  const completionCount = fields.filter((field) => field.value.trim().length > 0).length
  const completionPercentage = Math.round((completionCount / fields.length) * 100)
  const missingFields = fields.filter((field) => field.value.trim().length === 0)

  const isFormComplete = fields.every((field) => field.value.trim().length > 0)
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not set"
  const formattedBudget = budget ? `$${Number(budget).toLocaleString()}` : "Not set"

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    if (!validateFormData()) {
      toast.error("Please fix the errors below")
      return
    }

    setLoading(true)

    try {
      logger.info('Submitting request', { title, location })

      const response = await apiClient.post('/api/requests', {
        title,
        eventDate,
        location,
        budget: Number(budget),
        description: details,
        details,
      })

      if (response.error) {
        const errorMessage = Array.isArray(response.error) 
          ? response.error.map(err => err.message || err).join(', ')
          : response.error
        throw new Error(errorMessage)
      }

      logger.info('Request created successfully')
      toast.success("Request created successfully")
      router.push("/dashboard/client/requests")
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Failed to create request. Please try again."
      logger.error('Request submission failed', submissionError)
      setSubmitError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldBlur = () => {
    if (validationErrors.length > 0) {
      validateFormData()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-8">
        <section className="space-y-6 rounded-2xl border border-border bg-background p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground md:text-lg">Event details</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Start with the essentials so chefs can quickly understand the event and respond with relevant proposals.
              </p>
            </div>
            <div className="hidden rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              Required fields
            </div>
          </div>

          <div className="space-y-5">
            <FormFieldWrapper
              label="Title"
              error={fieldErrors.title}
              required
              helperText="Make it specific so chefs immediately understand the kind of event you are planning."
            >
              <Input
                id={fieldIds.title}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={handleFieldBlur}
                placeholder="Birthday dinner for 10 at home"
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.title)}
                className="h-11 rounded-xl border-border bg-background"
              />
            </FormFieldWrapper>

            <div className="grid gap-5 md:grid-cols-2">
              <FormFieldWrapper
                label="Event date"
                error={fieldErrors.eventDate}
                required
                helperText="Choose the preferred service date. Past dates are not allowed."
              >
                <Input
                  id={fieldIds.eventDate}
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  onBlur={handleFieldBlur}
                  disabled={loading}
                  min={new Date().toISOString().split("T")[0]}
                  aria-invalid={Boolean(fieldErrors.eventDate)}
                  className="h-11 rounded-xl border-border bg-background"
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                label="Location"
                error={fieldErrors.location}
                required
                helperText="Share the city, neighborhood, or venue so chefs can decide if they can serve the event."
              >
                <Input
                  id={fieldIds.location}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  onBlur={handleFieldBlur}
                  placeholder="Brooklyn, NY or your venue name"
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.location)}
                  className="h-11 rounded-xl border-border bg-background"
                />
              </FormFieldWrapper>
            </div>

            <FormFieldWrapper
              label="Budget"
              error={fieldErrors.budget}
              required
              helperText="Enter your total estimated budget so chefs can propose the right format and menu."
            >
              <Input
                id={fieldIds.budget}
                type="number"
                min={1}
                step="0.01"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                onBlur={handleFieldBlur}
                placeholder="1200"
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.budget)}
                className="h-11 rounded-xl border-border bg-background"
              />
            </FormFieldWrapper>

            <FormFieldWrapper
              label="Details"
              error={fieldErrors.details}
              required
              helperText="Include guest count, cuisine direction, dietary restrictions, service style, and anything chefs should know."
            >
              <Textarea
                id={fieldIds.details}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                onBlur={handleFieldBlur}
                placeholder="We’re hosting a seated dinner for 10 guests. Looking for a seasonal menu with vegetarian-friendly options, plated service, and a warm celebratory atmosphere."
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.details)}
                className="min-h-[160px] rounded-xl border-border bg-background"
              />
            </FormFieldWrapper>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 md:p-6">
          {submitError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <FormError message={submitError} />
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">Ready to publish?</h3>
              <p className="text-sm text-muted-foreground">
                Your request will be posted to the real marketplace and visible to matching chefs.
              </p>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={loading || !isFormComplete}
              className="h-11 rounded-xl px-5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Publishing request...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Publish request</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>

          {!isFormComplete && (
            <p className="text-sm text-muted-foreground">
              Complete all required fields before publishing.
            </p>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-24">
        <div className="space-y-6 rounded-2xl border border-border bg-background p-5 md:p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Summary
              </h2>
              <span className="text-sm font-medium text-foreground">{completionCount}/{fields.length}</span>
            </div>

            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {completionPercentage}% complete
              </p>
            </div>
          </div>

          <div className="space-y-4 border-y border-border py-5">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Title</p>
              <p className="text-sm font-medium text-foreground">{title || "Not set"}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Date</p>
                  <p className="text-sm text-foreground">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Location</p>
                  <p className="truncate text-sm text-foreground">{location || "Not set"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-1">
                <Wallet className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Budget</p>
                  <p className="text-sm text-foreground">{formattedBudget}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {missingFields.length === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <CircleAlert className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="text-sm font-medium text-foreground">
                {missingFields.length === 0 ? "Ready to publish" : "Still missing"}
              </h3>
            </div>

            {missingFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Everything is filled in. Publish now to start receiving proposals.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {missingFields.map((field) => (
                  <li key={field.key} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    <span>{field.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {validationErrors.length > 0 && (
              <p className="text-sm text-destructive">
                Fix {validationErrors.length} validation error{validationErrors.length !== 1 ? "s" : ""} before publishing.
              </p>
            )}
          </div>
        </div>
      </aside>
    </form>
  )
}
