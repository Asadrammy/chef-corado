"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { COUNTRY_OPTIONS, CUISINE_TYPES, DIETARY_REQUIREMENTS, SERVICE_TYPE_OPTIONS, calculateGuestComposition, type CountryCode } from "@/lib/request-options"

function formatIsoDate(date: Date) {
  return date.toISOString().split("T")[0]
}

function buildCalendarDays() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    return formatIsoDate(date)
  })
}

function dateRange(start: string, end: string) {
  if (!start || !end) return []
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return []
  const [from, to] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
  const dates: string[] = []
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(formatIsoDate(cursor))
  }
  return dates
}

export function MultiDayChefHireForm({ initialDraftId }: { initialDraftId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [country, setCountry] = React.useState<CountryCode>(COUNTRY_OPTIONS[0].value)
  const [serviceType, setServiceType] = React.useState(SERVICE_TYPE_OPTIONS[0].id)
  const [selectedDates, setSelectedDates] = React.useState<string[]>([])
  const [rangeStart, setRangeStart] = React.useState("")
  const [rangeEnd, setRangeEnd] = React.useState("")
  const [adults, setAdults] = React.useState("2")
  const [childrenUnder10, setChildrenUnder10] = React.useState("0")
  const [cuisines, setCuisines] = React.useState<string[]>([])
  const [dietary, setDietary] = React.useState<string[]>([])
  const [form, setForm] = React.useState({
    location: "",
    eventTime: "",
    budget: "",
    dailyServiceTimes: "",
    serviceNeedsPerDay: "",
    accommodationTravel: "",
    details: "",
  })
  const guestComposition = calculateGuestComposition({
    adultCount: Number(adults),
    childrenUnder10: Number(childrenUnder10),
    fallbackGuestCount: Number(adults),
  })
  const calendarDays = React.useMemo(buildCalendarDays, [])

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
        budget?: string | number
        adultCount?: number
        childrenUnder10?: number
        cuisinePreferences?: string[]
        dietaryRequirements?: string[]
        details?: string
      }
      if (draft.country) setCountry(draft.country)
      if (draft.serviceType && SERVICE_TYPE_OPTIONS.some((option) => option.id === draft.serviceType)) setServiceType(draft.serviceType)
      if (Array.isArray(draft.eventDates)) setSelectedDates(draft.eventDates.filter(Boolean).sort())
      if (draft.adultCount != null) setAdults(String(draft.adultCount))
      if (draft.childrenUnder10 != null) setChildrenUnder10(String(draft.childrenUnder10))
      if (Array.isArray(draft.cuisinePreferences)) setCuisines(draft.cuisinePreferences.filter((item) => (CUISINE_TYPES as readonly string[]).includes(item)).slice(0, 3))
      if (Array.isArray(draft.dietaryRequirements)) setDietary(draft.dietaryRequirements.filter((item) => (DIETARY_REQUIREMENTS as readonly string[]).includes(item)))
      setForm((current) => ({
        ...current,
        location: draft.location ?? current.location,
        eventTime: draft.eventTime ?? current.eventTime,
        budget: draft.budget != null ? String(draft.budget) : current.budget,
        details: draft.details ?? current.details,
      }))
    } catch {
      toast.error("We could not restore the saved multi-day draft")
    }
  }, [initialDraftId])

  const updateForm = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const toggleCuisine = (value: string) => {
    setCuisines((current) => {
      if (!current.includes(value) && current.length >= 3) return current
      return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    })
  }
  const toggleDietary = (value: string) => {
    setDietary((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }
  const toggleDate = (date: string) => {
    setSelectedDates((current) => (current.includes(date) ? current.filter((item) => item !== date) : [...current, date]).sort())
  }
  const applyRange = () => {
    const dates = dateRange(rangeStart, rangeEnd)
    if (dates.length) setSelectedDates(dates)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/requests/multi-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "Multi-Day Chef Hire",
          serviceType,
          cuisinePreferences: cuisines.length ? cuisines : ["Other"],
          dietaryRequirements: dietary,
          eventDates: selectedDates,
          eventTime: form.eventTime,
          location: form.location,
          country,
          guestCount: guestComposition.actualAttendeeCount,
          adultCount: guestComposition.adultCount,
          childrenUnder10: guestComposition.childrenUnder10,
          budget: Number(form.budget),
          details: form.details || undefined,
          dailyServiceTimes: form.dailyServiceTimes,
          serviceNeedsPerDay: form.serviceNeedsPerDay,
          accommodationTravel: form.accommodationTravel || undefined,
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
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Multi-Day Chef Hire</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Country">
              <Select value={country} onValueChange={(value) => setCountry(value as CountryCode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Location">
              <Input required value={form.location} onChange={(event) => updateForm("location", event.target.value)} />
            </Field>
            <Field label="Service type">
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_TYPE_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Preferred daily start time">
              <Input required type="time" value={form.eventTime} onChange={(event) => updateForm("eventTime", event.target.value)} />
            </Field>
            <Field label="Adults">
              <Input required type="number" min={0} value={adults} onChange={(event) => setAdults(event.target.value)} />
            </Field>
            <Field label="Children under 10">
              <Input type="number" min={0} value={childrenUnder10} onChange={(event) => setChildrenUnder10(event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label>Dates</Label>
                <p className="mt-1 text-sm text-muted-foreground">Select individual service days or apply a range. Minimum 2 dates.</p>
              </div>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-sm font-medium">{selectedDates.length} selected</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input type="date" min={new Date().toISOString().split("T")[0]} value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
              <Input type="date" min={rangeStart || new Date().toISOString().split("T")[0]} value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
              <Button type="button" variant="outline" onClick={applyRange}>Apply range</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {calendarDays.map((date) => {
                const selected = selectedDates.includes(date)
                const day = new Date(date)
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => toggleDate(date)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/60"}`}
                  >
                    <span className="block text-xs opacity-80">{day.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                    <span className="font-semibold">{day.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <Field label="Daily service times">
            <Textarea required value={form.dailyServiceTimes} onChange={(event) => updateForm("dailyServiceTimes", event.target.value)} />
          </Field>
          <Field label="Service needs per day">
            <Textarea required value={form.serviceNeedsPerDay} onChange={(event) => updateForm("serviceNeedsPerDay", event.target.value)} />
          </Field>
          <Field label="Accommodation or travel requirements">
            <Textarea value={form.accommodationTravel} onChange={(event) => updateForm("accommodationTravel", event.target.value)} />
          </Field>
          <Field label={`Total or daily budget (${COUNTRY_OPTIONS.find((option) => option.value === country)?.currency})`}>
            <Input required type="number" min={1} value={form.budget} onChange={(event) => updateForm("budget", event.target.value)} />
          </Field>
          <OptionGrid title="Cuisine preferences" options={CUISINE_TYPES} selected={cuisines} onToggle={toggleCuisine} />
          <OptionGrid title="Dietary requirements" options={DIETARY_REQUIREMENTS} selected={dietary} onToggle={toggleDietary} />
          <Field label="Tell us more">
            <Textarea value={form.details} onChange={(event) => updateForm("details", event.target.value)} />
          </Field>
          <Button type="submit" disabled={loading || selectedDates.length < 2}>{loading ? "Submitting..." : "Submit multi-day enquiry"}</Button>
        </CardContent>
      </Card>
      <Summary adults={guestComposition.adultCount} childCount={guestComposition.childrenUnder10} actual={guestComposition.actualAttendeeCount} billable={guestComposition.billableGuestCount} />
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-foreground"><span>{label}</span>{children}</label>
}

function OptionGrid({ title, options, selected, onToggle }: { title: string; options: readonly string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{title}</Label>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </div>
  )
}

function Summary({ adults, childCount, actual, billable }: { adults: number; childCount: number; actual: number; billable: number }) {
  return (
    <Card className="h-fit rounded-2xl lg:sticky lg:top-24">
      <CardHeader><CardTitle className="text-base">Billing basis</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{adults} adults</p>
        <p>{childCount} children under 10</p>
        <p>{actual} actual attendees</p>
        <p className="font-semibold text-foreground">{billable} billable equivalent guests</p>
        <p className="text-muted-foreground">This flow creates an enquiry/request only. It does not create a standard one-day checkout.</p>
      </CardContent>
    </Card>
  )
}
