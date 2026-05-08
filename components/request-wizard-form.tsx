"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, Sparkles, Users, UtensilsCrossed, Wallet } from "lucide-react"

import { FormError } from "@/components/form-error"
import { FormFieldWrapper } from "@/components/form-field-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api-client"
import { formatCurrency, getCurrencyConfig } from "@/lib/currency"
import {
  COMMUNICATION_POLICY,
  COUNTRY_OPTIONS,
  CUISINE_TYPES,
  DIETARY_REQUIREMENTS,
  EVENT_TYPES,
} from "@/lib/request-options"
import { requestSchema } from "@/lib/validation-schemas"

const steps = [
  "Event",
  "Food Preferences",
  "Schedule & Location",
  "Guests & Budget",
  "Notes & Review",
] as const

const stepDescriptions = [
  "Choose the type of event and add an optional internal name.",
  "Use the list selections to help chefs match cuisine and dietary needs.",
  "Confirm the event timing and where the chef should travel.",
  "Set your guest count and budget in the stored market currency.",
  "Add optional notes and review everything before publishing.",
] as const

type RequestWizardFormState = {
  title: string
  eventType: string
  cuisinePreferences: string[]
  dietaryRequirements: string[]
  eventDate: string
  eventTime: string
  location: string
  country: string
  guestCount: string
  budget: string
  details: string
}

type RequestWizardFormProps = {
  chefId?: string
}

export function RequestWizardForm({ chefId }: RequestWizardFormProps) {
  const router = useRouter()
  const [stepIndex, setStepIndex] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [formData, setFormData] = React.useState<RequestWizardFormState>({
    title: "",
    eventType: EVENT_TYPES[0],
    cuisinePreferences: [] as string[],
    dietaryRequirements: [] as string[],
    eventDate: "",
    eventTime: "",
    location: "",
    country: COUNTRY_OPTIONS[0].value,
    guestCount: "",
    budget: "",
    details: "",
  })

  const currencyConfig = getCurrencyConfig(formData.country)
  const isCookingClass = formData.eventType === "Cooking Class"
  const attendeeLabel = isCookingClass ? "students" : "guests"
  const attendeeLabelSingular = isCookingClass ? "student" : "guest"
  const hasSelectedChefContext = Boolean(chefId)
  const progressPercentage = ((stepIndex + 1) / steps.length) * 100

  const validateCurrent = React.useCallback(() => {
    // Step-based validation: only validate fields relevant to current step
    let parsed: any = { success: true }
    let stepErrors: Record<string, string> = {}

    switch (stepIndex) {
      case 0: // Event: only eventType is required
        if (!formData.eventType) {
          stepErrors.eventType = "Event type is required"
          parsed.success = false
        }
        break

      case 1: // Food Preferences: cuisinePreferences required
        if (!formData.cuisinePreferences || formData.cuisinePreferences.length === 0) {
          stepErrors.cuisinePreferences = "Select at least one cuisine preference"
          parsed.success = false
        }
        break

      case 2: // Schedule & Location: eventDate, eventTime, location, country required
        if (!formData.eventDate) {
          stepErrors.eventDate = "Event date is required"
          parsed.success = false
        }
        if (!formData.eventTime) {
          stepErrors.eventTime = "Event time is required"
          parsed.success = false
        }
        if (!formData.location || formData.location.length < 3) {
          stepErrors.location = "Location must be at least 3 characters"
          parsed.success = false
        }
        break

      case 3: // Guests & Budget: guestCount, budget required
        const guestCount = Number(formData.guestCount)
        if (!guestCount || guestCount < 1 || guestCount > 200) {
          stepErrors.guestCount = `${isCookingClass ? "Student" : "Guest"} count must be between 1 and 200`
          parsed.success = false
        }
        const budget = Number(formData.budget)
        if (!budget || budget <= 0) {
          stepErrors.budget = "Budget must be greater than 0"
          parsed.success = false
        }
        break

      case 4: // Notes & Review: optional, no validation required for navigation
        parsed.success = true
        break
    }

    if (parsed.success) {
      setFieldErrors({})
      return true
    }

    setFieldErrors(stepErrors)
    return false
  }, [formData, stepIndex])

  const validateFull = React.useCallback(() => {
    // Full-form validation for final submission
    const parsed = requestSchema.safeParse({
      title: formData.title || undefined,
      eventType: formData.eventType,
      cuisinePreferences: formData.cuisinePreferences,
      dietaryRequirements: formData.dietaryRequirements,
      eventDate: formData.eventDate,
      eventTime: formData.eventTime,
      location: formData.location,
      country: formData.country,
      guestCount: Number(formData.guestCount),
      budget: Number(formData.budget),
      details: formData.details || undefined,
    })

    if (parsed.success) {
      setFieldErrors({})
      return true
    }

    const nextErrors = Object.fromEntries(
      parsed.error.errors.map((error) => [error.path.join("."), error.message])
    )
    setFieldErrors(nextErrors)
    return false
  }, [formData])

  const handleMultiToggle = (field: "cuisinePreferences" | "dietaryRequirements", value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...prev[field], value]
        : prev[field].filter((entry) => entry !== value),
    }))
  }

  const nextStep = () => {
    if (!validateCurrent()) {
      toast.error("Please complete the required fields for this step")
      return
    }
    setStepIndex((value) => Math.min(value + 1, steps.length - 1))
  }

  const previousStep = () => {
    setStepIndex((value) => Math.max(value - 1, 0))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    if (!validateFull()) {
      toast.error("Please review the form before publishing")
      return
    }

    setLoading(true)

    try {
      const response = await apiClient.post("/api/requests", {
        title: formData.title || undefined,
        eventType: formData.eventType,
        cuisinePreferences: formData.cuisinePreferences,
        dietaryRequirements: formData.dietaryRequirements,
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        location: formData.location,
        country: formData.country,
        guestCount: Number(formData.guestCount),
        budget: Number(formData.budget),
        details: formData.details || undefined,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      toast.success("Request created successfully")
      router.push("/dashboard/client/requests")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create request"
      setSubmitError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="brand-soft-panel rounded-[24px] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Start with the event type</p>
                  <p className="text-sm text-muted-foreground">This is the main label chefs will use to understand your request quickly.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">What you&apos;ll choose next</p>
              <p className="mt-1">After choosing the event type, you&apos;ll select cuisine and dietary preferences before setting date, location, {attendeeLabel}, and budget.</p>
            </div>

            <FormFieldWrapper label="Event type" error={fieldErrors.eventType} required>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {EVENT_TYPES.map((eventType) => {
                  const selected = formData.eventType === eventType

                  return (
                    <button
                      key={eventType}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, eventType }))}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${selected ? "border-primary bg-primary/10 shadow-sm shadow-primary/10" : "border-border bg-background hover:border-primary/30 hover:bg-primary/5"}`}
                    >
                      <p className={`text-sm font-semibold ${selected ? "text-foreground" : "text-foreground"}`}>{eventType}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{eventType === "Cooking Class" ? "Hands-on or demonstration cooking session" : "Private event request shared with chefs"}</p>
                    </button>
                  )
                })}
              </div>
            </FormFieldWrapper>

            <FormFieldWrapper label="Optional event name" helperText="If left blank, we will generate a clear request title automatically.">
              <Input
                value={formData.title}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={isCookingClass ? "Optional: Italian cooking class for 8 students" : "Optional: Birthday dinner for 10 guests"}
                className="h-11 rounded-xl"
              />
            </FormFieldWrapper>
          </div>
        )
      case 1:
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <FormFieldWrapper label="Cuisine preferences" error={fieldErrors.cuisinePreferences} required>
              <div className="grid gap-3 rounded-2xl border border-border bg-background p-4">
                {CUISINE_TYPES.map((option) => (
                  <label key={option} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${formData.cuisinePreferences.includes(option) ? "border-primary/30 bg-primary/5" : "border-border/70 bg-muted/20 hover:border-primary/20"}`}>
                    <Checkbox
                      checked={formData.cuisinePreferences.includes(option)}
                      onCheckedChange={(checked) => handleMultiToggle("cuisinePreferences", option, Boolean(checked))}
                    />
                    <span className="font-medium text-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </FormFieldWrapper>

            <FormFieldWrapper label="Dietary requirements" error={fieldErrors.dietaryRequirements} helperText="Optional">
              <div className="grid gap-3 rounded-2xl border border-border bg-background p-4">
                {DIETARY_REQUIREMENTS.map((option) => (
                  <label key={option} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${formData.dietaryRequirements.includes(option) ? "border-primary/30 bg-primary/5" : "border-border/70 bg-muted/20 hover:border-primary/20"}`}>
                    <Checkbox
                      checked={formData.dietaryRequirements.includes(option)}
                      onCheckedChange={(checked) => handleMultiToggle("dietaryRequirements", option, Boolean(checked))}
                    />
                    <span className="font-medium text-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </FormFieldWrapper>
          </div>
        )
      case 2:
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <FormFieldWrapper label="Event date" error={fieldErrors.eventDate} required>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={formData.eventDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, eventDate: event.target.value }))}
                className="h-11 rounded-xl"
              />
            </FormFieldWrapper>

            <FormFieldWrapper label="Preferred time" error={fieldErrors.eventTime} required>
              <Input
                type="time"
                value={formData.eventTime}
                onChange={(event) => setFormData((prev) => ({ ...prev, eventTime: event.target.value }))}
                className="h-11 rounded-xl"
              />
            </FormFieldWrapper>

            <FormFieldWrapper label="Country" error={fieldErrors.country} required>
              <Select value={formData.country} onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormFieldWrapper>

            <FormFieldWrapper label="Location" error={fieldErrors.location} required>
              <Input
                value={formData.location}
                onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="City, venue, or postcode"
                className="h-11 rounded-xl"
              />
            </FormFieldWrapper>
          </div>
        )
      case 3:
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <FormFieldWrapper label={isCookingClass ? "Student count" : "Guest count"} error={fieldErrors.guestCount} required>
              <Input
                type="number"
                min={1}
                max={200}
                value={formData.guestCount}
                onChange={(event) => setFormData((prev) => ({ ...prev, guestCount: event.target.value }))}
                className="h-11 rounded-xl"
              />
            </FormFieldWrapper>

            <FormFieldWrapper label={isCookingClass ? `Total class budget (${currencyConfig.currency})` : `Budget (${currencyConfig.currency})`} error={fieldErrors.budget} required>
              <Input
                type="number"
                min={1}
                step="1"
                value={formData.budget}
                onChange={(event) => setFormData((prev) => ({ ...prev, budget: event.target.value }))}
                className="h-11 rounded-xl"
              />
            </FormFieldWrapper>
          </div>
        )
      default:
        return (
          <div className="space-y-5">
            <FormFieldWrapper label="Extra notes" error={fieldErrors.details} helperText="Optional details for chefs.">
              <Textarea
                value={formData.details}
                onChange={(event) => setFormData((prev) => ({ ...prev, details: event.target.value }))}
                placeholder="Service style, kitchen setup, guests to avoid allergens for, or any special instructions."
                className="min-h-[160px] rounded-xl"
              />
            </FormFieldWrapper>

            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <h3 className="text-sm font-semibold text-foreground">Review</h3>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formData.eventType}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{formData.location || "Not set"}</div>
                <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{formData.eventTime || "Time not set"}</div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4" />{formData.guestCount || "0"} {attendeeLabel}</div>
                <div className="flex items-center gap-2"><Wallet className="h-4 w-4" />{formatCurrency(Number(formData.budget || 0), currencyConfig.currency, currencyConfig.locale)}</div>
                <div className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4" />{formData.cuisinePreferences.join(", ") || "Cuisine not selected"}</div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-6">
        <Card className="brand-card-surface rounded-[28px]">
          <CardHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <CardTitle>Create request</CardTitle>
                <p className="text-sm text-muted-foreground">A structured step-by-step request helps chefs respond faster with better-fit proposals.</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Step {stepIndex + 1} of {steps.length}</span>
                  <span>{Math.round(progressPercentage)}% complete</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="brand-gradient-button h-full rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasSelectedChefContext ? (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Booking request for a selected chef</p>
                <p className="mt-1">
                  Your request will be created from this chef&apos;s public profile context while still using the existing marketplace request flow.
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-5">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={`rounded-2xl border px-4 py-3 text-left text-xs ${index === stepIndex ? "border-primary/30 bg-primary/10 text-foreground shadow-sm" : index < stepIndex ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted/30 text-muted-foreground"}`}
                >
                  <p className="font-semibold">{index + 1}. {step}</p>
                  <p className="mt-1 text-[11px] leading-4 opacity-90">{stepDescriptions[index]}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Current step: {steps[stepIndex]}</p>
              <p className="mt-1">{stepDescriptions[stepIndex]}</p>
            </div>

            {renderStep()}

            {submitError && <FormError message={submitError} />}

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={previousStep} disabled={stepIndex === 0 || loading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {stepIndex < steps.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={loading}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? "Publishing..." : "Publish request"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24">
        <Card className="brand-card-surface rounded-[28px]">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {hasSelectedChefContext ? (
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground">
                This request was started from a chef profile and keeps the existing request/proposal flow intact.
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Choose from the event, cuisine, and dietary lists to help chefs respond faster with accurate proposals.
            </div>
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground">
              {isCookingClass
                ? "Cooking class requests use student-focused wording throughout the summary so chefs understand the session format immediately."
                : "Structured request details help chefs respond with more accurate menus, timings, and pricing."}
            </div>
            <div>
              <p className="text-muted-foreground">Event type</p>
              <p className="font-medium text-foreground">{formData.eventType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Optional event name</p>
              <p className="font-medium text-foreground">{formData.title || "Not added"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cuisine</p>
              <p className="font-medium text-foreground">{formData.cuisinePreferences.join(", ") || "Not selected"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dietary requirements</p>
              <p className="font-medium text-foreground">{formData.dietaryRequirements.join(", ") || "None selected"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date & time</p>
              <p className="font-medium text-foreground">{formData.eventDate || "Not set"} {formData.eventTime || ""}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Country & location</p>
              <p className="font-medium text-foreground">{COUNTRY_OPTIONS.find((option) => option.value === formData.country)?.label ?? formData.country} · {formData.location || "Not set"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{isCookingClass ? "Students" : "Guests"}</p>
              <p className="font-medium text-foreground">{formData.guestCount || "0"} {formData.guestCount === "1" ? attendeeLabelSingular : attendeeLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Budget</p>
              <p className="font-medium text-foreground">{formatCurrency(Number(formData.budget || 0), currencyConfig.currency, currencyConfig.locale)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Notes</p>
              <p className="font-medium text-foreground">{formData.details || "No extra notes added yet"}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Structured event details help chefs respond faster and with better-fit proposals.
            </div>
            <div className="rounded-xl border border-border bg-background/80 p-3 text-xs text-muted-foreground">
              {COMMUNICATION_POLICY} By publishing a request, you confirm that bookings and coordination will stay on-platform and remain subject to the <Link href="/terms/client" className="font-medium text-foreground hover:text-primary">Client Terms</Link>, <Link href="/terms/chef" className="font-medium text-foreground hover:text-primary">Chef Terms</Link>, and <Link href="/privacy" className="font-medium text-foreground hover:text-primary">Privacy Policy</Link>.
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  )
}
