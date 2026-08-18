"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { CalendarDays, CheckCircle2, ChefHat, Clock, Home, MapPin, Minus, Plus, Search, ShieldCheck, Users, WalletCards } from "lucide-react"

import { PublicChefCard, type PublicChefCardData } from "@/components/public/public-chef-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, getCurrencyConfig } from "@/lib/currency"
import { COUNTRY_OPTIONS, CUISINE_TYPES, DIETARY_REQUIREMENTS, EVENT_TYPE_OPTIONS, SERVICE_TYPE_OPTIONS, CHILD_BILLING_RULE_COPY, calculateGuestComposition, resolvePricingState, validateServiceSpecificAnswers } from "@/lib/request-options"
import { getInactiveMarketMessage, getMarketConfig } from "@/lib/marketplace-rules"
import { cn } from "@/lib/utils"

type LocalChefDiscoveryWizardProps = {
  initialLocation?: string
  initialCuisine?: string
  chefs: PublicChefCardData[]
  chefSearchUnavailable?: boolean
}

const cuisines = CUISINE_TYPES
const dietaryOptions = ["None", ...DIETARY_REQUIREMENTS]
const calendarDaysToShow = 42

function formatCurrencyRange(min: number | null | undefined, max: number | null | undefined, currency: string, locale: string) {
  if (!min && !max) return "Local quote"
  if (min && max) return `${formatCurrency(min, currency, locale)}-${formatCurrency(max, currency, locale)} pp`
  return `From ${formatCurrency(min ?? max ?? 0, currency, locale)} pp`
}

function formatIsoDate(date: Date) {
  return date.toISOString().split("T")[0]
}

function buildCalendarDays() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: calendarDaysToShow }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    return formatIsoDate(date)
  })
}

function dateRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (!start || !end || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return []
  const [from, to] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
  const dates: string[] = []
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(formatIsoDate(cursor))
  }
  return dates
}

function createDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function LocalChefDiscoveryWizard({ initialLocation = "", initialCuisine = "", chefs, chefSearchUnavailable = false }: LocalChefDiscoveryWizardProps) {
  const [step, setStep] = useState(0)
  const [draftId] = useState(createDraftId)
  const [venueType, setVenueType] = useState("")
  const [venueOwnership, setVenueOwnership] = useState("")
  const [country, setCountry] = useState<string>(COUNTRY_OPTIONS[0].value)
  const [location, setLocation] = useState(initialLocation)
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [multiDayDates, setMultiDayDates] = useState<string[]>([])
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")
  const [adults, setAdults] = useState(8)
  const [childrenUnder10, setChildrenUnder10] = useState(0)
  const [eventType, setEventType] = useState("")
  const [serviceType, setServiceType] = useState("")
  const [pricingTier, setPricingTier] = useState("")
  const [serviceSpecificAnswers, setServiceSpecificAnswers] = useState<Record<string, string>>({})
  const [budget, setBudget] = useState("")
  const [fullTimeDetails, setFullTimeDetails] = useState({
    desiredStartDate: "",
    expectedDuration: "",
    liveInPreference: "Live-out",
    workingDays: "",
    workingHours: "",
    salaryPeriod: "Monthly",
  })
  const [cuisineSearch, setCuisineSearch] = useState(initialCuisine)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(initialCuisine ? [initialCuisine] : [])
  const [dietary, setDietary] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [matchedChefs, setMatchedChefs] = useState<PublicChefCardData[]>(chefs)
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState("")

  const filteredCuisines = useMemo(() => {
    const query = cuisineSearch.trim().toLowerCase()
    return cuisines.filter((cuisine) => !query || cuisine.toLowerCase().includes(query))
  }, [cuisineSearch])
  const selectedService = useMemo(
    () => SERVICE_TYPE_OPTIONS.find((service) => service.id === serviceType) ?? null,
    [serviceType],
  )
  const currencyConfig = getCurrencyConfig(country)
  const marketConfig = getMarketConfig(country)
  const marketBookingEnabled = marketConfig.bookingEnabled
  const selectedPricingState = serviceType
    ? resolvePricingState({ serviceType, countryCode: country, tier: pricingTier, budget: budget ? Number(budget) : null })
    : null
  const selectedPricingRule = selectedPricingState?.rule ?? null
  const missingServiceAnswers = selectedService
    ? validateServiceSpecificAnswers(selectedService.id, serviceSpecificAnswers)
    : []
  const calendarDays = useMemo(() => buildCalendarDays(), [])
  const guestComposition = useMemo(
    () => calculateGuestComposition({ adultCount: adults, childrenUnder10, fallbackGuestCount: adults }),
    [adults, childrenUnder10],
  )
  const budgetWarning = selectedPricingState?.budgetWarning ?? null

  useEffect(() => {
    window.sessionStorage.setItem(`chefachef:request-draft:${draftId}`, JSON.stringify({
      country,
      location: location.trim(),
      eventDate,
      eventDates: multiDayDates,
      eventTime,
      guestCount: guestComposition.actualAttendeeCount,
      adultCount: guestComposition.adultCount,
      childrenUnder10: guestComposition.childrenUnder10,
      actualAttendeeCount: guestComposition.actualAttendeeCount,
      billableGuestCount: guestComposition.billableGuestCount,
      pricingGuestCount: guestComposition.pricingGuestCount,
      eventType,
      serviceType,
      serviceTier: pricingTier,
      serviceSpecificAnswers,
      budget: budget.trim(),
      fullTimeDetails,
      cuisinePreferences: selectedCuisines,
      dietaryRequirements: dietary.filter((item) => item !== "None"),
      details: notes.trim(),
    }))
  }, [budget, country, dietary, draftId, eventDate, eventTime, eventType, fullTimeDetails, guestComposition, location, multiDayDates, notes, pricingTier, selectedCuisines, serviceSpecificAnswers, serviceType])

  const createRequestPath = eventType === "Multi-Day Chef Hire"
    ? `/dashboard/client/multi-day-chef-hire?draft=${encodeURIComponent(draftId)}`
    : eventType === "Full-Time Chef"
      ? `/dashboard/client/full-time-chef?draft=${encodeURIComponent(draftId)}`
      : `/dashboard/client/create-request?draft=${encodeURIComponent(draftId)}`
  const callbackParam = encodeURIComponent(createRequestPath)
  const customerLoginHref = `/login?role=CLIENT&callbackUrl=${callbackParam}`
  const customerSignupHref = `/register?role=CLIENT&callbackUrl=${callbackParam}`
  const chefSearchHref = `/browse-chefs${location.trim() || selectedCuisines[0] ? `?${new URLSearchParams({
    ...(location.trim() ? { location: location.trim() } : {}),
    ...(selectedCuisines[0] ? { query: selectedCuisines[0] } : {}),
  }).toString()}` : ""}`

  const canContinue = (() => {
    if (step === 0) return Boolean(venueType) && (venueType !== "Home" || Boolean(venueOwnership))
    if (step === 1) return Boolean(location.trim()) && marketBookingEnabled
    if (step === 2) return Boolean(eventDate && eventTime)
    if (step === 3) return guestComposition.actualAttendeeCount > 0
    if (step === 4) {
      if (eventType === "Multi-Day Chef Hire") return multiDayDates.length >= 2
      if (eventType === "Full-Time Chef") {
        return Boolean(fullTimeDetails.desiredStartDate && fullTimeDetails.expectedDuration.trim() && fullTimeDetails.workingDays.trim() && fullTimeDetails.workingHours.trim())
      }
      return Boolean(eventType)
    }
    if (step === 5) return Boolean(serviceType)
    if (step === 6) return Boolean(pricingTier && budget) && missingServiceAnswers.length === 0
    if (step === 8) return dietary.length > 0
    return true
  })()
  const isFinalStep = step === 10

  useEffect(() => {
    if (!isFinalStep) return

    const controller = new AbortController()
    const params = new URLSearchParams()
    if (location.trim()) params.set("location", location.trim())
    if (selectedCuisines.length) params.set("cuisines", selectedCuisines.join(","))
    if (serviceType) params.set("serviceType", serviceType)
    if (eventType) params.set("eventType", eventType)
    if (eventDate) params.set("eventDate", eventDate)
    if (budget) params.set("maxPrice", budget)
    if (dietary.filter((item) => item !== "None").length) params.set("dietary", dietary.filter((item) => item !== "None").join(","))

    const refreshMatches = async () => {
      setMatchLoading(true)
      setMatchError("")
      return fetch(`/api/chefs/search${params.toString() ? `?${params.toString()}` : ""}`, { signal: controller.signal })
        .then((response) => {
        if (!response.ok) throw new Error("Unable to refresh chef matches")
        return response.json() as Promise<PublicChefCardData[]>
        })
        .then((data) => setMatchedChefs(data))
        .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setMatchedChefs(chefs)
        setMatchError(error instanceof Error ? error.message : "Unable to refresh chef matches")
        })
        .finally(() => setMatchLoading(false))
    }

    void refreshMatches()

    return () => controller.abort()
  }, [budget, chefs, dietary, eventDate, eventType, isFinalStep, location, selectedCuisines, serviceType])

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((current) => {
      if (current.includes(cuisine)) {
        return current.filter((item) => item !== cuisine)
      }
      return current.length >= 3 ? current : [...current, cuisine]
    })
  }

  const cuisineForwardLabel = step === 7 && selectedCuisines.length === 0 ? "Skip" : "Next"

  const toggleMultiDayDate = (date: string) => {
    setMultiDayDates((current) => {
      const next = current.includes(date) ? current.filter((item) => item !== date) : [...current, date]
      const sorted = next.sort()
      setEventDate(sorted[0] ?? eventDate)
      return sorted
    })
  }

  const applyRange = () => {
    const dates = dateRange(rangeStart, rangeEnd)
    if (dates.length) {
      setMultiDayDates(dates)
      setEventDate(dates[0])
    }
  }

  const updateFullTimeDetails = (key: keyof typeof fullTimeDetails, value: string) => {
    setFullTimeDetails((current) => ({ ...current, [key]: value }))
    if (key === "desiredStartDate") setEventDate(value)
  }

  const toggleDietary = (item: string) => {
    setDietary((current) => {
      if (item === "None") {
        return current.includes("None") ? [] : ["None"]
      }
      const withoutNone = current.filter((value) => value !== "None")
      return withoutNone.includes(item) ? withoutNone.filter((value) => value !== item) : [...withoutNone, item]
    })
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[32px] border border-border/60 bg-background shadow-sm shadow-black/5">
        <div className="border-b border-border/60 px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Guided chef discovery</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Plan the request before you sign in.</h2>
            </div>
            <Button asChild variant="ghost" className="rounded-full text-muted-foreground">
              <Link href="/browse-chefs">Browse all chefs</Link>
            </Button>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[linear-gradient(135deg,hsl(var(--brand-primary)),hsl(var(--brand-secondary)))] transition-all" style={{ width: `${((step + 1) / 11) * 100}%` }} />
          </div>
          {chefSearchUnavailable ? (
            <div className="mt-5 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
              The public chef catalogue is temporarily unavailable. You can still prepare the request details and continue to customer access.
            </div>
          ) : null}
        </div>

        <div className="min-h-[520px] px-5 py-10 sm:px-8 lg:px-12">
          {step === 0 ? (
            <StepShell title="Where is your event?" description="Tell us whether the chef is coming to a home or a rented venue.">
              <div className="grid gap-4 md:grid-cols-2">
                <OptionButton selected={venueType === "Home"} onClick={() => setVenueType("Home")} icon={<Home className="h-5 w-5" />} title="Home" description="Your home or a friend's home." />
                <OptionButton selected={venueType === "Rented venue"} onClick={() => setVenueType("Rented venue")} icon={<MapPin className="h-5 w-5" />} title="Rented venue" description="Airbnb, holiday rental, event space, or private venue." />
              </div>
              {venueType === "Home" ? (
                <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
                  <OptionButton selected={venueOwnership === "My home"} onClick={() => setVenueOwnership("My home")} title="My home" description="The chef will cook at your address." />
                  <OptionButton selected={venueOwnership === "Friend's home"} onClick={() => setVenueOwnership("Friend's home")} title="Friend's home" description="The chef will cook at a friend's address." />
                </div>
              ) : null}
            </StepShell>
          ) : null}

          {step === 1 ? (
            <StepShell title="Where?" description="Choose the country and enter the postcode, city, area, or venue for the occasion.">
              <div className="mx-auto grid max-w-2xl gap-4">
                <div>
                  <label className="sr-only" htmlFor="guided-country">Country</label>
                  <select
                    id="guided-country"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className="h-14 w-full rounded-2xl border border-input bg-background px-4 text-base text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {COUNTRY_OPTIONS.map((option) => {
                      const market = getMarketConfig(option.value)
                      return (
                        <option key={option.value} value={option.value}>
                          {option.label}{market.bookingEnabled ? "" : " - launching soon"}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <label className="sr-only" htmlFor="guided-location">Postcode, city, or area</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input id="guided-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Postcode, city, area, or venue" className="h-14 rounded-2xl pl-12 text-base" />
                </div>
                {!marketBookingEnabled ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    {getInactiveMarketMessage(country)}
                  </div>
                ) : location.trim() ? (
                  <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-foreground">
                    <strong>Good news.</strong> We will use this area to surface matching chefs and request details.
                  </div>
                ) : null}
              </div>
            </StepShell>
          ) : null}

          {step === 2 ? (
            <StepShell title="When?" description="Choose your best date and preferred time estimate. You can confirm details with the chef later.">
              <div className="mx-auto grid max-w-md gap-4">
                <label className="sr-only" htmlFor="guided-date">Event date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input id="guided-date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} min={new Date().toISOString().split("T")[0]} className="h-14 rounded-2xl pl-12 text-base" />
                </div>
                <label className="sr-only" htmlFor="guided-time">Preferred time</label>
                <Input id="guided-time" type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="h-14 rounded-2xl text-base" />
              </div>
            </StepShell>
          ) : null}

          {step === 3 ? (
            <StepShell title="For how many?" description={CHILD_BILLING_RULE_COPY}>
              <div className="mx-auto grid max-w-2xl gap-4 md:grid-cols-2">
                <Counter label="Adults" value={adults} min={0} onChange={setAdults} />
                <Counter label="Children under 10" value={childrenUnder10} min={0} onChange={setChildrenUnder10} />
              </div>
              <div className="mx-auto mt-5 grid max-w-2xl gap-3 rounded-[24px] border border-border/70 bg-muted/20 p-4 text-sm md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Actual attendees</p>
                  <p className="text-xl font-semibold text-foreground">{guestComposition.actualAttendeeCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Billable equivalent</p>
                  <p className="text-xl font-semibold text-foreground">{guestComposition.billableGuestCount}</p>
                </div>
              </div>
            </StepShell>
          ) : null}

          {step === 4 ? (
            <StepShell title="What type of event are you planning?" description="Give chefs enough context to shape menus and service style.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <OptionButton
                    key={option.id}
                    selected={eventType === option.label}
                    onClick={() => setEventType(option.label)}
                    icon={<CalendarDays className="h-5 w-5" />}
                    title={option.label}
                    description={"bookingMode" in option && option.bookingMode === "MULTI_DAY" ? "Choose multiple service dates in this flow." : "bookingMode" in option && option.bookingMode === "FULL_TIME_PLACEMENT" ? "Start a household placement enquiry." : undefined}
                  />
                ))}
              </div>
              {eventType === "Multi-Day Chef Hire" ? (
                <div className="mt-6 rounded-[24px] border border-border/70 bg-muted/20 p-4 sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-foreground">Choose multiple service days</h4>
                      <p className="text-sm leading-6 text-muted-foreground">Select individual dates, or apply a date range. At least two days are required.</p>
                    </div>
                    <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-sm font-semibold text-foreground">{multiDayDates.length} selected</span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Input type="date" min={new Date().toISOString().split("T")[0]} value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} className="h-11 rounded-xl" aria-label="Range start date" />
                    <Input type="date" min={rangeStart || new Date().toISOString().split("T")[0]} value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} className="h-11 rounded-xl" aria-label="Range end date" />
                    <Button type="button" variant="outline" className="rounded-xl" onClick={applyRange}>Apply range</Button>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                    {calendarDays.map((date) => {
                      const selected = multiDayDates.includes(date)
                      const day = new Date(date)
                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => toggleMultiDayDate(date)}
                          className={cn(
                            "rounded-2xl border px-3 py-3 text-left transition-colors",
                            selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-background hover:border-primary/50 hover:bg-muted/20",
                          )}
                        >
                          <span className="block text-xs font-medium opacity-80">{day.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                          <span className="mt-1 block text-sm font-semibold">{day.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {eventType === "Full-Time Chef" ? (
                <div className="mt-6 grid gap-4 rounded-[24px] border border-border/70 bg-muted/20 p-4 sm:p-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <h4 className="text-base font-semibold text-foreground">Full-Time Chef placement details</h4>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Start the household placement enquiry here before account creation.</p>
                  </div>
                  <Input type="date" min={new Date().toISOString().split("T")[0]} value={fullTimeDetails.desiredStartDate} onChange={(event) => updateFullTimeDetails("desiredStartDate", event.target.value)} className="h-12 rounded-xl" aria-label="Desired start date" />
                  <Input value={fullTimeDetails.expectedDuration} onChange={(event) => updateFullTimeDetails("expectedDuration", event.target.value)} placeholder="Expected duration" className="h-12 rounded-xl" />
                  <select value={fullTimeDetails.liveInPreference} onChange={(event) => updateFullTimeDetails("liveInPreference", event.target.value)} className="h-12 rounded-xl border border-input bg-background px-3 text-sm">
                    <option>Live-in</option>
                    <option>Live-out</option>
                    <option>Flexible</option>
                  </select>
                  <select value={fullTimeDetails.salaryPeriod} onChange={(event) => updateFullTimeDetails("salaryPeriod", event.target.value)} className="h-12 rounded-xl border border-input bg-background px-3 text-sm">
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Annual</option>
                  </select>
                  <Input value={fullTimeDetails.workingDays} onChange={(event) => updateFullTimeDetails("workingDays", event.target.value)} placeholder="Working days, e.g. Monday-Friday" className="h-12 rounded-xl" />
                  <Input value={fullTimeDetails.workingHours} onChange={(event) => updateFullTimeDetails("workingHours", event.target.value)} placeholder="Working hours, e.g. 9am-6pm" className="h-12 rounded-xl" />
                </div>
              ) : null}
            </StepShell>
          ) : null}

          {step === 5 ? (
            <StepShell title="Type of food?" description="Choose the dining format or number of courses you have in mind.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {SERVICE_TYPE_OPTIONS.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setServiceType(service.id)
                      setPricingTier(service.serviceTiers[0] ?? "")
                      setServiceSpecificAnswers({})
                    }}
                    className={cn(
                      "overflow-hidden rounded-2xl border text-left transition-colors",
                      serviceType === service.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border/70 bg-background hover:border-primary/50 hover:bg-muted/20",
                    )}
                  >
                    {(() => {
                      const pricingState = resolvePricingState({ serviceType: service.id, countryCode: country, tier: service.serviceTiers[0] })
                      const rule = pricingState.rule
                      return (
                        <>
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                      <Image
                        src={service.image.src}
                        alt={service.image.alt}
                        fill
                        loading="eager"
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    <span className="block p-4">
                      <span className="flex items-start justify-between gap-3">
                        <span className="block text-base font-semibold text-foreground">{service.label}</span>
                        <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">{formatCurrencyRange(rule?.pricePerPersonMin, rule?.pricePerPersonMax, currencyConfig.currency, currencyConfig.locale)}</span>
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-muted-foreground">{service.description}</span>
                      <span className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-1">{rule?.minimumSpend ? `Min spend ${formatCurrency(rule.minimumSpend, currencyConfig.currency, currencyConfig.locale)}` : "Local quote pending"}</span>
                        <span className="rounded-full bg-muted px-2 py-1">{service.minGuests ?? rule?.minGuests ?? 1}+ guests</span>
                      </span>
                    </span>
                        </>
                      )
                    })()}
                  </button>
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 6 ? (
            <StepShell title="Pricing" description="Review the guidance for your selected food type, then enter a realistic total budget.">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[24px] border border-border/70 bg-muted/20 p-5">
                  <div className="flex items-start gap-4">
                    <span className="rounded-2xl bg-primary/10 p-3 text-primary"><WalletCards className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">Selected service</p>
                      <h4 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{selectedService?.label ?? "Choose a service"}</h4>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedPricingRule?.customerGuidance ?? "Pricing guidance will appear after selecting a food type."}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Metric label="Minimum spend" value={selectedPricingRule?.minimumSpend ? formatCurrency(selectedPricingRule.minimumSpend, currencyConfig.currency, currencyConfig.locale) : "Local quote pending"} />
                    <Metric label="Per person" value={formatCurrencyRange(selectedPricingRule?.pricePerPersonMin, selectedPricingRule?.pricePerPersonMax, currencyConfig.currency, currencyConfig.locale)} />
                    <Metric label="Minimum guests" value={`${selectedPricingRule?.minGuests ?? selectedService?.minGuests ?? 1}`} />
                  </div>
                  {selectedService ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {selectedService.requiredQuestions
                        .filter((question) => !["cuisinePreferences", "dietaryRequirements", "serviceTier"].includes(question.id))
                        .map((question) => (
                          <div key={question.id} className="space-y-2">
                            <label className="text-sm font-semibold text-foreground" htmlFor={`guided-${question.id}`}>
                              {question.label}{question.required ? " *" : ""}
                            </label>
                            {question.options?.length ? (
                              <select
                                id={`guided-${question.id}`}
                                value={serviceSpecificAnswers[question.id] ?? ""}
                                onChange={(event) => setServiceSpecificAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
                              >
                                <option value="">Choose an option</option>
                                {question.options.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : (
                              <Textarea
                                id={`guided-${question.id}`}
                                value={serviceSpecificAnswers[question.id] ?? ""}
                                onChange={(event) => setServiceSpecificAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                                className="min-h-24 rounded-xl"
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-[24px] border border-border/70 bg-background p-5">
                  <p className="text-sm font-semibold text-foreground">Service style</p>
                  <div className="mt-3 grid gap-2">
                    {(selectedService?.serviceTiers.length ? selectedService.serviceTiers : ["Custom quote"]).map((tier) => (
                      <OptionButton key={tier} selected={pricingTier === tier} onClick={() => setPricingTier(tier)} icon={<ChefHat className="h-5 w-5" />} title={tier} description="Used to guide chef proposal expectations." />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <label htmlFor="guided-budget" className="text-sm font-semibold text-foreground">Total budget</label>
                <Input id="guided-budget" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Enter your preferred total budget" className="mt-2 h-14 rounded-2xl text-base" />
              </div>
              {budgetWarning ? (
                <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm font-medium text-foreground">
                  {budgetWarning}
                </div>
              ) : null}
            </StepShell>
          ) : null}

          {step === 7 ? (
            <StepShell title="Which cuisines do you like?" description="Choose up to 3 options, or skip if you are open to suggestions.">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input value={cuisineSearch} onChange={(event) => setCuisineSearch(event.target.value)} placeholder="Search cuisines" className="h-14 rounded-2xl pl-12 text-base" />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {filteredCuisines.map((cuisine) => {
                  const selected = selectedCuisines.includes(cuisine)
                  const disabled = !selected && selectedCuisines.length >= 3
                  return (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() => toggleCuisine(cuisine)}
                      disabled={disabled}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-full border px-5 py-3 text-sm font-semibold transition-colors",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-background hover:border-primary/50",
                        disabled ? "cursor-not-allowed opacity-45 hover:border-border/70" : "",
                      )}
                    >
                      {cuisine}
                    </button>
                  )
                })}
              </div>
            </StepShell>
          ) : null}

          {step === 8 ? (
            <StepShell title="Does your group have dietary requirements?" description="You can always confirm with your guests and inform the chef later.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dietaryOptions.map((item) => (
                  <OptionButton key={item} selected={dietary.includes(item)} onClick={() => toggleDietary(item)} title={item} />
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 9 ? (
            <StepShell title="Tell us more" description="Share favourite cuisines, dietary notes, casual or formal vibe, and anything the chef should know.">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Two of us are gluten-free. We would like sharing-style plates. This is for a birthday, and we are hoping for the chef to provide crockery and a waiter." className="mx-auto min-h-56 max-w-2xl rounded-2xl text-base" />
            </StepShell>
          ) : null}

          {isFinalStep ? (
            <StepShell title={`See ${matchLoading ? "matching" : matchedChefs.length || "matching"} available chefs`} description="Your discovery details are ready. Matches are refreshed using location, date, guests, cuisine, budget, service type, dietary needs, and event context where data is available.">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-5 md:grid-cols-2">
                  {matchLoading ? (
                    <div className="rounded-[28px] border border-border/60 bg-muted/20 p-6 text-sm leading-6 text-muted-foreground md:col-span-2">
                      Refreshing chef matches for this request...
                    </div>
                  ) : null}
                  {matchedChefs.slice(0, 4).map((chef) => (
                    <PublicChefCard key={chef.id} chef={chef} />
                  ))}
                  {chefSearchUnavailable ? (
                    <div className="rounded-[28px] border border-border/60 bg-muted/20 p-6 text-sm leading-6 text-muted-foreground md:col-span-2">
                      The public chef catalogue is temporarily unavailable, but your request path is ready. Continue to customer access to create the request and review matching chefs when data is available.
                    </div>
                  ) : !matchLoading && matchedChefs.length === 0 ? (
                    <div className="rounded-[28px] border border-border/60 bg-muted/20 p-6 text-sm leading-6 text-muted-foreground md:col-span-2">
                      No chefs matched these details yet. Continue to customer access to save the request, or browse with broader filters.
                    </div>
                  ) : null}
                  {matchError ? (
                    <div className="rounded-[28px] border border-warning/30 bg-warning/10 p-6 text-sm leading-6 text-foreground md:col-span-2">
                      {matchError}. Showing the last available chef list.
                    </div>
                  ) : null}
                </div>
                <aside className="rounded-[28px] border border-border/60 bg-muted/20 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">Next step</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Save your request</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Customer access lets you keep reviews, proposals, messages, and booking coordination inside the platform.
                  </p>
                  <div className="mt-5 grid gap-2 rounded-2xl border border-border/70 bg-background p-4 text-sm">
                    <SummaryLine icon={<CalendarDays className="h-4 w-4" />} label={eventType || "Event not set"} />
                    <SummaryLine icon={<ChefHat className="h-4 w-4" />} label={selectedService?.label ?? "Food type not set"} />
                    <SummaryLine icon={<Users className="h-4 w-4" />} label={`${guestComposition.actualAttendeeCount} attendees, ${guestComposition.billableGuestCount} billable`} />
                    <SummaryLine icon={<Clock className="h-4 w-4" />} label={eventType === "Multi-Day Chef Hire" ? `${multiDayDates.length} service days` : eventType === "Full-Time Chef" ? `${fullTimeDetails.expectedDuration || "Duration pending"}` : `${eventDate || "Date pending"} ${eventTime || ""}`} />
                  </div>
                  <div className="mt-5 grid gap-3">
                    <Button asChild className="brand-gradient-button rounded-2xl border-0">
                      <Link href={customerSignupHref}>Customer Signup</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-2xl border-border/70 bg-background">
                      <Link href={customerLoginHref}>Customer Login</Link>
                    </Button>
                    <Button asChild variant="ghost" className="rounded-2xl text-muted-foreground">
                      <Link href={chefSearchHref}>Browse available chefs</Link>
                    </Button>
                  </div>
                </aside>
              </div>
            </StepShell>
          ) : null}
        </div>

        <div className="border-t border-border/60 bg-muted/20 px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 font-semibold text-foreground"><ShieldCheck className="h-4 w-4" /> Booking protection</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Secure payments</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Vetted chef profiles</span>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="min-w-32 rounded-2xl border-border/70 bg-background" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
                Back
              </Button>
              {!isFinalStep ? (
                <Button type="button" className="brand-gradient-button min-w-32 rounded-2xl border-0" disabled={!canContinue} onClick={() => setStep((value) => Math.min(10, value + 1))}>
                  {cuisineForwardLabel}
                </Button>
              ) : (
                <Button asChild className="brand-gradient-button min-w-32 rounded-2xl border-0">
                  <Link href={customerSignupHref}>Continue</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StepShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h3 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h3>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function OptionButton({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean
  onClick: () => void
  icon?: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-20 items-center gap-4 rounded-2xl border p-4 text-left transition-colors",
        selected ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border/70 bg-background hover:border-primary/50 hover:bg-muted/20",
      )}
    >
      {icon ? <span className="text-primary">{icon}</span> : null}
      <span>
        <span className="block text-base font-semibold text-foreground">{title}</span>
        {description ? <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span> : null}
      </span>
    </button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function SummaryLine({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-primary">{icon}</span>
      <span className="font-medium text-foreground">{label}</span>
    </div>
  )
}

function Counter({
  label,
  value,
  min,
  onChange,
}: {
  label: string
  value: number
  min: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-[28px] border border-border/70 bg-muted/20 px-6 py-5">
      <div className="flex items-center gap-3 text-lg font-semibold">
        <Users className="h-5 w-5 text-primary" />
        {label}
      </div>
      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => onChange(Math.max(min, value - 1))}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center text-xl font-semibold">{value}</span>
        <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => onChange(value + 1)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
