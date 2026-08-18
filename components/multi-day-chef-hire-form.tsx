"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { COUNTRY_OPTIONS, CUISINE_TYPES, DIETARY_REQUIREMENTS, SERVICE_TYPE_OPTIONS, calculateGuestComposition, getServiceTypeLabel, type CountryCode } from "@/lib/request-options"
import { getInactiveMarketMessage, getMarketConfig } from "@/lib/marketplace-rules"

type BudgetMode = "PER_DAY" | "TOTAL_EVENT"

type DayRequirementState = {
  startTime: string
  endTime: string
  serviceType: string
  serviceTier: string
  cuisinePreferences: string[]
  dietaryRequirements: string[]
  adultCount: string
  childrenUnder10: string
  budget: string
  notes: string
  serviceSpecificAnswers: Record<string, string | string[]>
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function todayKey() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return formatIsoDate(today)
}

function isPastDate(date: string) {
  return parseLocalDate(date) < parseLocalDate(todayKey())
}

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      key: formatIsoDate(date),
      inMonth: date.getMonth() === month.getMonth(),
      isToday: formatIsoDate(date) === todayKey(),
      label: date.getDate(),
    }
  })
}

function dateRange(start: string, end: string) {
  if (!start || !end) return []
  const startDate = parseLocalDate(start)
  const endDate = parseLocalDate(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return []
  const [from, to] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
  const dates: string[] = []
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    const value = formatIsoDate(cursor)
    if (!isPastDate(value)) dates.push(value)
  }
  return dates
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toPositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function formatDateLabel(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function defaultDayRequirement(input: {
  serviceType: string
  serviceTier: string
  startTime: string
  cuisines: string[]
  dietary: string[]
  adults: string
  childrenUnder10: string
  dailyBudget: string
}): DayRequirementState {
  return {
    startTime: input.startTime,
    endTime: "",
    serviceType: input.serviceType,
    serviceTier: input.serviceTier,
    cuisinePreferences: input.cuisines,
    dietaryRequirements: input.dietary,
    adultCount: input.adults,
    childrenUnder10: input.childrenUnder10,
    budget: input.dailyBudget,
    notes: "",
    serviceSpecificAnswers: {},
  }
}

export function MultiDayChefHireForm({ initialDraftId }: { initialDraftId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [country, setCountry] = React.useState<CountryCode>(COUNTRY_OPTIONS[0].value)
  const [selectedDates, setSelectedDates] = React.useState<string[]>([])
  const [requirements, setRequirements] = React.useState<Record<string, DayRequirementState>>({})
  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [rangeStart, setRangeStart] = React.useState("")
  const [rangeEnd, setRangeEnd] = React.useState("")
  const [budgetMode, setBudgetMode] = React.useState<BudgetMode>("PER_DAY")
  const [totalBudget, setTotalBudget] = React.useState("")
  const [defaultDailyBudget, setDefaultDailyBudget] = React.useState("")
  const [defaultServiceType, setDefaultServiceType] = React.useState(SERVICE_TYPE_OPTIONS[0].id)
  const [defaultServiceTier, setDefaultServiceTier] = React.useState(SERVICE_TYPE_OPTIONS[0].serviceTiers[0] ?? "")
  const [defaultStartTime, setDefaultStartTime] = React.useState("")
  const [defaultAdults, setDefaultAdults] = React.useState("2")
  const [defaultChildrenUnder10, setDefaultChildrenUnder10] = React.useState("0")
  const [defaultCuisines, setDefaultCuisines] = React.useState<string[]>([])
  const [defaultDietary, setDefaultDietary] = React.useState<string[]>([])
  const [location, setLocation] = React.useState("")
  const [accommodationTravel, setAccommodationTravel] = React.useState("")
  const [details, setDetails] = React.useState("")

  const currency = COUNTRY_OPTIONS.find((option) => option.value === country)?.currency ?? "GBP"
  const marketConfig = getMarketConfig(country)
  const cells = React.useMemo(() => monthCells(calendarMonth), [calendarMonth])
  const defaultService = SERVICE_TYPE_OPTIONS.find((service) => service.id === defaultServiceType) ?? SERVICE_TYPE_OPTIONS[0]

  React.useEffect(() => {
    if (!initialDraftId) return
    const rawDraft = window.sessionStorage.getItem(`chefachef:request-draft:${initialDraftId}`)
    if (!rawDraft) return
    try {
      const draft = JSON.parse(rawDraft) as {
        country?: CountryCode
        location?: string
        eventDates?: string[]
        eventTime?: string
        serviceType?: string
        serviceTier?: string
        budget?: string | number
        adultCount?: number
        childrenUnder10?: number
        cuisinePreferences?: string[]
        dietaryRequirements?: string[]
        details?: string
      }
      if (draft.country) setCountry(draft.country)
      if (draft.location) setLocation(draft.location)
      if (draft.eventTime) setDefaultStartTime(draft.eventTime)
      if (draft.serviceType && SERVICE_TYPE_OPTIONS.some((option) => option.id === draft.serviceType)) setDefaultServiceType(draft.serviceType)
      if (draft.serviceTier) setDefaultServiceTier(draft.serviceTier)
      if (draft.budget != null) setDefaultDailyBudget(String(draft.budget))
      if (draft.adultCount != null) setDefaultAdults(String(draft.adultCount))
      if (draft.childrenUnder10 != null) setDefaultChildrenUnder10(String(draft.childrenUnder10))
      if (Array.isArray(draft.cuisinePreferences)) setDefaultCuisines(draft.cuisinePreferences.filter((item) => (CUISINE_TYPES as readonly string[]).includes(item)).slice(0, 3))
      if (Array.isArray(draft.dietaryRequirements)) setDefaultDietary(draft.dietaryRequirements.filter((item) => (DIETARY_REQUIREMENTS as readonly string[]).includes(item)))
      if (draft.details) setDetails(draft.details)
      if (Array.isArray(draft.eventDates)) {
        const dates = [...new Set(draft.eventDates.filter((date) => date && !isPastDate(date)))].sort()
        const restoredCuisines = Array.isArray(draft.cuisinePreferences) ? draft.cuisinePreferences.filter((item) => (CUISINE_TYPES as readonly string[]).includes(item)).slice(0, 3) : []
        const restoredDietary = Array.isArray(draft.dietaryRequirements) ? draft.dietaryRequirements.filter((item) => (DIETARY_REQUIREMENTS as readonly string[]).includes(item)) : []
        setSelectedDates(dates)
        setRequirements((current) => {
          const next = { ...current }
          for (const date of dates) {
            next[date] = defaultDayRequirement({
              serviceType: draft.serviceType ?? SERVICE_TYPE_OPTIONS[0].id,
              serviceTier: draft.serviceTier ?? SERVICE_TYPE_OPTIONS[0].serviceTiers[0] ?? "",
              startTime: draft.eventTime ?? "",
              cuisines: restoredCuisines,
              dietary: restoredDietary,
              adults: draft.adultCount != null ? String(draft.adultCount) : "2",
              childrenUnder10: draft.childrenUnder10 != null ? String(draft.childrenUnder10) : "0",
              dailyBudget: draft.budget != null ? String(draft.budget) : "",
            })
          }
          return next
        })
      }
    } catch {
      toast.error("We could not restore the saved multi-day draft")
    }
  }, [initialDraftId])

  const defaultRequirement = React.useMemo(() => defaultDayRequirement({
    serviceType: defaultServiceType,
    serviceTier: defaultServiceTier,
    startTime: defaultStartTime,
    cuisines: defaultCuisines,
    dietary: defaultDietary,
    adults: defaultAdults,
    childrenUnder10: defaultChildrenUnder10,
    dailyBudget: defaultDailyBudget,
  }), [defaultAdults, defaultChildrenUnder10, defaultCuisines, defaultDailyBudget, defaultDietary, defaultServiceTier, defaultServiceType, defaultStartTime])

  const getRequirement = React.useCallback((date: string) => requirements[date] ?? defaultRequirement, [defaultRequirement, requirements])

  const setRequirement = (date: string, patch: Partial<DayRequirementState>) => {
    setRequirements((current) => ({
      ...current,
      [date]: {
        ...getRequirement(date),
        ...patch,
      },
    }))
  }

  const toggleDate = (date: string) => {
    if (isPastDate(date)) return
    setSelectedDates((current) => {
      if (current.includes(date)) {
        setRequirements((existing) => {
          const next = { ...existing }
          delete next[date]
          return next
        })
        return current.filter((item) => item !== date)
      }

      setRequirements((existing) => ({
        ...existing,
        [date]: getRequirement(date),
      }))
      return [...current, date].sort()
    })
  }

  const applyRange = () => {
    const dates = dateRange(rangeStart, rangeEnd)
    if (!dates.length) return
    setSelectedDates((current) => [...new Set([...current, ...dates])].sort())
    setRequirements((current) => {
      const next = { ...current }
      for (const date of dates) next[date] = next[date] ?? defaultRequirement
      return next
    })
  }

  const applyDefaultsToAll = () => {
    setRequirements(Object.fromEntries(selectedDates.map((date) => [date, defaultRequirement])))
  }

  const totalBudgetEstimate = budgetMode === "TOTAL_EVENT"
    ? toPositiveNumber(totalBudget) ?? 0
    : selectedDates.reduce((sum, date) => sum + (toPositiveNumber(getRequirement(date).budget) ?? toPositiveNumber(defaultDailyBudget) ?? 0), 0)

  const incompleteDates = selectedDates.filter((date) => {
    const day = getRequirement(date)
    const service = SERVICE_TYPE_OPTIONS.find((option) => option.id === day.serviceType)
    return !day.startTime || day.cuisinePreferences.length === 0 || (service?.serviceTiers.length ? !day.serviceTier : false)
  })

  const canSubmit = selectedDates.length >= 2 &&
    marketConfig.bookingEnabled &&
    location.trim().length >= 3 &&
    totalBudgetEstimate > 0 &&
    incompleteDates.length === 0

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const dateRequirements = selectedDates.map((date) => {
        const day = getRequirement(date)
        const guestComposition = calculateGuestComposition({
          adultCount: toNumber(day.adultCount),
          childrenUnder10: toNumber(day.childrenUnder10),
          fallbackGuestCount: toNumber(day.adultCount, 1),
        })

        return {
          date,
          startTime: day.startTime,
          endTime: day.endTime || undefined,
          serviceType: day.serviceType,
          serviceTier: day.serviceTier || undefined,
          cuisinePreferences: day.cuisinePreferences,
          dietaryRequirements: day.dietaryRequirements,
          serviceSpecificAnswers: day.serviceSpecificAnswers,
          adultCount: guestComposition.adultCount,
          childrenUnder10: guestComposition.childrenUnder10,
          actualAttendeeCount: guestComposition.actualAttendeeCount,
          billableGuestCount: guestComposition.billableGuestCount,
          pricingGuestCount: guestComposition.pricingGuestCount,
          budget: budgetMode === "PER_DAY" ? toPositiveNumber(day.budget) ?? toPositiveNumber(defaultDailyBudget) : undefined,
          notes: day.notes || undefined,
        }
      })
      const firstDay = dateRequirements[0]

      const response = await fetch("/api/requests/multi-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "Multi-Day Chef Hire",
          serviceType: defaultServiceType,
          serviceTier: defaultServiceTier || undefined,
          cuisinePreferences: defaultCuisines.length ? defaultCuisines : firstDay.cuisinePreferences,
          dietaryRequirements: defaultDietary,
          eventDates: selectedDates,
          eventTime: defaultStartTime || firstDay.startTime,
          location,
          country,
          guestCount: firstDay.actualAttendeeCount,
          adultCount: toNumber(defaultAdults),
          childrenUnder10: toNumber(defaultChildrenUnder10),
          budgetMode,
          totalBudget: budgetMode === "TOTAL_EVENT" ? toPositiveNumber(totalBudget) : undefined,
          defaultDailyBudget: budgetMode === "PER_DAY" ? toPositiveNumber(defaultDailyBudget) : undefined,
          budget: totalBudgetEstimate,
          details: details || undefined,
          accommodationTravel: accommodationTravel || undefined,
          dateRequirements,
          dailyServiceTimes: dateRequirements.map((day) => `${day.date}: ${day.startTime}${day.endTime ? `-${day.endTime}` : ""}`).join("\n"),
          serviceNeedsPerDay: dateRequirements.map((day) => `${day.date}: ${getServiceTypeLabel(day.serviceType)}${day.notes ? ` - ${day.notes}` : ""}`).join("\n"),
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to create multi-day request")
      }

      toast.success("Multi-day chef hire enquiry created")
      router.push("/dashboard/client/requests")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create multi-day request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Global event details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Country">
                <Select value={country} onValueChange={(value) => setCountry(value as CountryCode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRY_OPTIONS.map((option) => {
                    const market = getMarketConfig(option.value)
                    return <SelectItem key={option.value} value={option.value}>{option.label}{market.bookingEnabled ? "" : " - launching soon"}</SelectItem>
                  })}</SelectContent>
                </Select>
                {!marketConfig.bookingEnabled ? (
                  <p className="text-xs font-normal leading-5 text-amber-700">{getInactiveMarketMessage(country)}</p>
                ) : null}
              </Field>
              <Field label="Location">
                <Input required value={location} onChange={(event) => setLocation(event.target.value)} />
              </Field>
            </div>
            <Field label="Overall notes">
              <Textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Context chefs should know for the whole engagement." />
            </Field>
            <Field label="Accommodation or travel requirements">
              <Textarea value={accommodationTravel} onChange={(event) => setAccommodationTravel(event.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Default daily requirements</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Default service type">
                <Select value={defaultServiceType} onValueChange={(value) => {
                  const nextService = SERVICE_TYPE_OPTIONS.find((option) => option.id === value)
                  setDefaultServiceType(value)
                  setDefaultServiceTier(nextService?.serviceTiers[0] ?? "")
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPE_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              {defaultService.serviceTiers.length ? (
                <Field label="Default service tier">
                  <Select value={defaultServiceTier} onValueChange={setDefaultServiceTier}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{defaultService.serviceTiers.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field label="Default start time">
                <Input required type="time" value={defaultStartTime} onChange={(event) => setDefaultStartTime(event.target.value)} />
              </Field>
              <Field label="Adults">
                <Input required type="number" min={0} value={defaultAdults} onChange={(event) => setDefaultAdults(event.target.value)} />
              </Field>
              <Field label="Children under 10">
                <Input type="number" min={0} value={defaultChildrenUnder10} onChange={(event) => setDefaultChildrenUnder10(event.target.value)} />
              </Field>
            </div>
            <OptionGrid title="Default cuisines" options={CUISINE_TYPES} selected={defaultCuisines} max={3} onToggle={(value) => setDefaultCuisines((current) => toggleLimited(current, value, 3))} />
            <OptionGrid title="Default dietary requirements" options={DIETARY_REQUIREMENTS} selected={defaultDietary} onToggle={(value) => setDefaultDietary((current) => toggleLimited(current, value, 8))} />
            {selectedDates.length ? <Button type="button" variant="outline" onClick={applyDefaultsToAll}>Apply defaults to selected days</Button> : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Date selection</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">Select at least 2 non-consecutive or consecutive service dates.</p>
              </div>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-sm font-medium">{selectedDates.length} selected</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input type="date" min={todayKey()} value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
              <Input type="date" min={rangeStart || todayKey()} value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
              <Button type="button" variant="outline" onClick={applyRange}>Add range</Button>
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between">
                <Button type="button" variant="ghost" size="icon" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="font-semibold">{calendarMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
                <Button type="button" variant="ghost" size="icon" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {cells.map((cell) => {
                  const selected = selectedDates.includes(cell.key)
                  const disabled = isPastDate(cell.key)
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selected}
                      onClick={() => toggleDate(cell.key)}
                      className={`min-h-11 rounded-lg border text-sm font-medium transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : cell.isToday ? "border-primary/70 bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/60"} ${cell.inMonth ? "" : "opacity-45"} ${disabled ? "cursor-not-allowed opacity-30 hover:border-border" : ""}`}
                    >
                      {cell.label}
                    </button>
                  )
                })}
              </div>
            </div>
            {selectedDates.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedDates.map((date) => (
                  <span key={date} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm">
                    {formatDateLabel(date)}
                    <button type="button" onClick={() => toggleDate(date)} aria-label={`Remove ${formatDateLabel(date)}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {selectedDates.length ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Daily requirements</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {selectedDates.map((date) => (
                <DayRequirementCard
                  key={date}
                  date={date}
                  currency={currency}
                  budgetMode={budgetMode}
                  requirement={getRequirement(date)}
                  onChange={(patch) => setRequirement(date, patch)}
                />
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Budget</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setBudgetMode("PER_DAY")} className={`rounded-xl border p-4 text-left text-sm ${budgetMode === "PER_DAY" ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
                <span className="block font-semibold">Budget per day</span>
                <span className="text-muted-foreground">Use a daily budget, with optional date overrides.</span>
              </button>
              <button type="button" onClick={() => setBudgetMode("TOTAL_EVENT")} className={`rounded-xl border p-4 text-left text-sm ${budgetMode === "TOTAL_EVENT" ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
                <span className="block font-semibold">Total budget</span>
                <span className="text-muted-foreground">Use one budget for all selected service dates.</span>
              </button>
            </div>
            {budgetMode === "PER_DAY" ? (
              <Field label={`Default daily budget (${currency})`}>
                <Input required type="number" min={1} value={defaultDailyBudget} onChange={(event) => setDefaultDailyBudget(event.target.value)} />
              </Field>
            ) : (
              <Field label={`Total budget for all selected days (${currency})`}>
                <Input required type="number" min={1} value={totalBudget} onChange={(event) => setTotalBudget(event.target.value)} />
              </Field>
            )}
          </CardContent>
        </Card>

        {selectedDates.length < 2 ? <p className="text-sm text-muted-foreground">Select at least two service dates before submitting.</p> : null}
        {incompleteDates.length ? <p className="text-sm text-muted-foreground">Complete time, cuisine, and tier fields for every selected date.</p> : null}
        <Button type="submit" disabled={loading || !canSubmit}>{loading ? "Submitting..." : "Submit multi-day enquiry"}</Button>
      </div>

      <Summary
        selectedDates={selectedDates}
        requirements={requirements}
        fallback={defaultRequirement}
        currency={currency}
        budgetMode={budgetMode}
        totalBudgetEstimate={totalBudgetEstimate}
      />
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-foreground"><span>{label}</span>{children}</label>
}

function toggleLimited(current: string[], value: string, max: number) {
  if (current.includes(value)) return current.filter((item) => item !== value)
  if (current.length >= max) return current
  return [...current, value]
}

function OptionGrid({ title, options, selected, max, onToggle }: { title: string; options: readonly string[]; selected: string[]; max?: number; onToggle: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{title}</Label>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const disabled = Boolean(max && selected.length >= max && !selected.includes(option))
          return (
            <label key={option} className={`flex items-center gap-2 rounded-xl border border-border p-3 text-sm ${disabled ? "opacity-50" : ""}`}>
              <Checkbox checked={selected.includes(option)} disabled={disabled} onCheckedChange={() => onToggle(option)} />
              {option}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function DayRequirementCard({
  date,
  currency,
  budgetMode,
  requirement,
  onChange,
}: {
  date: string
  currency: string
  budgetMode: BudgetMode
  requirement: DayRequirementState
  onChange: (patch: Partial<DayRequirementState>) => void
}) {
  const selectedService = SERVICE_TYPE_OPTIONS.find((service) => service.id === requirement.serviceType) ?? SERVICE_TYPE_OPTIONS[0]
  const guestComposition = calculateGuestComposition({
    adultCount: toNumber(requirement.adultCount),
    childrenUnder10: toNumber(requirement.childrenUnder10),
    fallbackGuestCount: toNumber(requirement.adultCount, 1),
  })
  const questions = [...selectedService.requiredQuestions, ...selectedService.optionalQuestions].filter((question) => !["cuisinePreferences", "dietaryRequirements", "serviceTier"].includes(question.id))

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-4 flex flex-col gap-1">
        <p className="font-semibold">{formatDateLabel(date)}</p>
        <p className="text-sm text-muted-foreground">{guestComposition.actualAttendeeCount} attendees - {guestComposition.billableGuestCount} billable equivalent guests</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Service type">
          <Select value={requirement.serviceType} onValueChange={(value) => {
            const nextService = SERVICE_TYPE_OPTIONS.find((option) => option.id === value)
            onChange({ serviceType: value, serviceTier: nextService?.serviceTiers[0] ?? "", serviceSpecificAnswers: {} })
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SERVICE_TYPE_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {selectedService.serviceTiers.length ? (
          <Field label="Service tier">
            <Select value={requirement.serviceTier} onValueChange={(value) => onChange({ serviceTier: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{selectedService.serviceTiers.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        ) : null}
        <Field label="Start time">
          <Input required type="time" value={requirement.startTime} onChange={(event) => onChange({ startTime: event.target.value })} />
        </Field>
        <Field label="Optional end time">
          <Input type="time" value={requirement.endTime} onChange={(event) => onChange({ endTime: event.target.value })} />
        </Field>
        <Field label="Adults">
          <Input required type="number" min={0} value={requirement.adultCount} onChange={(event) => onChange({ adultCount: event.target.value })} />
        </Field>
        <Field label="Children under 10">
          <Input type="number" min={0} value={requirement.childrenUnder10} onChange={(event) => onChange({ childrenUnder10: event.target.value })} />
        </Field>
        {budgetMode === "PER_DAY" ? (
          <Field label={`Daily budget override (${currency})`}>
            <Input type="number" min={1} value={requirement.budget} onChange={(event) => onChange({ budget: event.target.value })} />
          </Field>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4">
        <OptionGrid title="Cuisines for this day" options={CUISINE_TYPES} selected={requirement.cuisinePreferences} max={3} onToggle={(value) => onChange({ cuisinePreferences: toggleLimited(requirement.cuisinePreferences, value, 3) })} />
        <OptionGrid title="Dietary requirements for this day" options={DIETARY_REQUIREMENTS} selected={requirement.dietaryRequirements} onToggle={(value) => onChange({ dietaryRequirements: toggleLimited(requirement.dietaryRequirements, value, 8) })} />
        {questions.map((question) => (
          <ServiceQuestionField
            key={question.id}
            question={question}
            value={requirement.serviceSpecificAnswers[question.id]}
            onChange={(value) => onChange({ serviceSpecificAnswers: { ...requirement.serviceSpecificAnswers, [question.id]: value } })}
          />
        ))}
        <Field label="Notes for this day">
          <Textarea value={requirement.notes} onChange={(event) => onChange({ notes: event.target.value })} />
        </Field>
      </div>
    </div>
  )
}

function ServiceQuestionField({
  question,
  value,
  onChange,
}: {
  question: { id: string; label: string; type: string; options?: readonly string[]; required?: boolean; helperText?: string }
  value?: string | string[]
  onChange: (value: string | string[]) => void
}) {
  if (question.type === "single_select" && question.options?.length) {
    return (
      <Field label={question.label}>
        <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{question.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    )
  }

  if (question.type === "multi_select" && question.options?.length) {
    const selected = Array.isArray(value) ? value : []
    return (
      <OptionGrid title={question.label} options={question.options} selected={selected} onToggle={(option) => onChange(toggleLimited(selected, option, question.options?.length ?? 20))} />
    )
  }

  if (question.type === "number") {
    return (
      <Field label={question.label}>
        <Input required={question.required} type="number" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} />
      </Field>
    )
  }

  return (
    <Field label={question.label}>
      <Textarea required={question.required} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

function Summary({
  selectedDates,
  requirements,
  fallback,
  currency,
  budgetMode,
  totalBudgetEstimate,
}: {
  selectedDates: string[]
  requirements: Record<string, DayRequirementState>
  fallback: DayRequirementState
  currency: string
  budgetMode: BudgetMode
  totalBudgetEstimate: number
}) {
  return (
    <Card className="h-fit rounded-2xl xl:sticky xl:top-24">
      <CardHeader><CardTitle className="text-base">Multi-day review</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-muted-foreground">Service days</p>
          <p className="text-xl font-semibold text-foreground">{selectedDates.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-muted-foreground">Budget mode</p>
          <p className="font-semibold text-foreground">{budgetMode === "PER_DAY" ? "Per day" : "Total event"}</p>
          <p className="mt-1 font-semibold text-foreground">{new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(totalBudgetEstimate)}</p>
        </div>
        <div className="space-y-2">
          {selectedDates.map((date) => {
            const day = requirements[date] ?? fallback
            const guestComposition = calculateGuestComposition({
              adultCount: toNumber(day.adultCount),
              childrenUnder10: toNumber(day.childrenUnder10),
              fallbackGuestCount: toNumber(day.adultCount, 1),
            })
            return (
              <div key={date} className="rounded-xl border border-border p-3">
                <p className="font-semibold">{formatDateLabel(date)}</p>
                <p className="text-muted-foreground">{day.startTime || "Time pending"}{day.endTime ? `-${day.endTime}` : ""}</p>
                <p>{getServiceTypeLabel(day.serviceType)}</p>
                <p className="text-muted-foreground">{day.cuisinePreferences.join(", ") || "Cuisine pending"}</p>
                <p className="text-muted-foreground">{guestComposition.actualAttendeeCount} attendees</p>
              </div>
            )
          })}
        </div>
        <p className="text-muted-foreground">This creates one grouped Multi-Day request. Chefs still send a custom proposal before checkout.</p>
      </CardContent>
    </Card>
  )
}
