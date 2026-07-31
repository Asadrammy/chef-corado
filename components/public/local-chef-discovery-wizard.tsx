"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { CalendarDays, CheckCircle2, ChefHat, Home, MapPin, Minus, Plus, Search, ShieldCheck, Utensils, Users } from "lucide-react"

import { PublicChefCard, type PublicChefCardData } from "@/components/public/public-chef-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type LocalChefDiscoveryWizardProps = {
  initialLocation?: string
  initialCuisine?: string
  chefs: PublicChefCardData[]
  chefSearchUnavailable?: boolean
}

const eventTypes = ["Birthday", "Anniversary", "Dinner party", "Family event", "Work event", "Holiday gathering", "Meal prep", "Other"]
const courseTypes = ["3 course meal", "4-5 course meal", "6-9 course meal", "Sharing plates", "Buffet", "Canapes"]
const pricingTiers = [
  { label: "Casual dining", helper: "Approachable private dining", budget: "40-70 per person" },
  { label: "Fine dining", helper: "Elevated menus and service", budget: "70-200 per person" },
  { label: "Signature chef", helper: "Premium chef-led occasions", budget: "200+ per person" },
]
const cuisines = [
  "Italian",
  "Indian",
  "BBQ",
  "British",
  "Pan Asian",
  "Fine Dining",
  "Japanese",
  "Mexican",
  "Middle Eastern",
  "Chinese",
  "Mediterranean",
  "Thai",
  "Spanish",
  "Greek",
  "Caribbean",
  "Modern European",
  "French",
  "Fusion",
  "Turkish",
  "Korean",
  "Vietnamese",
  "Sri Lankan",
]
const dietaryOptions = ["None", "All vegetarian", "All vegan", "Some vegetarian", "Some vegan", "Gluten-free", "No egg", "No nuts", "No pork", "No seafood", "No beef", "Halal", "Kosher", "Other"]

export function LocalChefDiscoveryWizard({ initialLocation = "", initialCuisine = "", chefs, chefSearchUnavailable = false }: LocalChefDiscoveryWizardProps) {
  const [step, setStep] = useState(0)
  const [venueType, setVenueType] = useState("")
  const [location, setLocation] = useState(initialLocation)
  const [eventDate, setEventDate] = useState("")
  const [guests, setGuests] = useState(8)
  const [eventType, setEventType] = useState("")
  const [courseType, setCourseType] = useState("")
  const [pricingTier, setPricingTier] = useState("")
  const [budget, setBudget] = useState("")
  const [cuisineSearch, setCuisineSearch] = useState(initialCuisine)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(initialCuisine ? [initialCuisine] : [])
  const [dietary, setDietary] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  const filteredCuisines = useMemo(() => {
    const query = cuisineSearch.trim().toLowerCase()
    return cuisines.filter((cuisine) => !query || cuisine.toLowerCase().includes(query))
  }, [cuisineSearch])

  const requestParams = useMemo(() => {
    const params = new URLSearchParams()
    if (location.trim()) params.set("location", location.trim())
    if (eventDate) params.set("eventDate", eventDate)
    if (guests) params.set("guests", String(guests))
    if (eventType) params.set("eventType", eventType)
    if (courseType) params.set("courses", courseType)
    if (pricingTier) params.set("pricing", pricingTier)
    if (budget.trim()) params.set("budget", budget.trim())
    if (selectedCuisines.length) params.set("cuisine", selectedCuisines.join(","))
    if (dietary.length) params.set("dietary", dietary.join(","))
    if (notes.trim()) params.set("notes", notes.trim())
    return params
  }, [budget, courseType, dietary, eventDate, eventType, guests, location, notes, pricingTier, selectedCuisines])

  const createRequestPath = `/dashboard/client/create-request${requestParams.toString() ? `?${requestParams.toString()}` : ""}`
  const callbackParam = encodeURIComponent(createRequestPath)
  const customerLoginHref = `/login?role=CLIENT&callbackUrl=${callbackParam}`
  const customerSignupHref = `/register?role=CLIENT&callbackUrl=${callbackParam}`
  const chefSearchHref = `/browse-chefs${location.trim() || selectedCuisines[0] ? `?${new URLSearchParams({
    ...(location.trim() ? { location: location.trim() } : {}),
    ...(selectedCuisines[0] ? { query: selectedCuisines[0] } : {}),
  }).toString()}` : ""}`

  const canContinue = [
    Boolean(venueType),
    Boolean(location.trim()),
    Boolean(eventDate),
    guests > 0,
    Boolean(eventType),
    Boolean(courseType),
    Boolean(pricingTier),
    true,
    dietary.length > 0,
    true,
    true,
  ][step]
  const isFinalStep = step === 10

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((current) => {
      if (current.includes(cuisine)) {
        return current.filter((item) => item !== cuisine)
      }
      return current.length >= 3 ? current : [...current, cuisine]
    })
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
            </StepShell>
          ) : null}

          {step === 1 ? (
            <StepShell title="Where?" description="Enter the postcode, city, area, or venue for the occasion.">
              <div className="mx-auto max-w-2xl">
                <label className="sr-only" htmlFor="guided-location">Postcode, city, or area</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input id="guided-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Postcode, city, area, or venue" className="h-14 rounded-2xl pl-12 text-base" />
                </div>
                {location.trim() ? (
                  <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-foreground">
                    <strong>Good news.</strong> We will use this area to surface matching chefs and request details.
                  </div>
                ) : null}
              </div>
            </StepShell>
          ) : null}

          {step === 2 ? (
            <StepShell title="When?" description="Choose your best event date estimate. You can confirm details with the chef later.">
              <div className="mx-auto max-w-md">
                <label className="sr-only" htmlFor="guided-date">Event date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input id="guided-date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} min={new Date().toISOString().split("T")[0]} className="h-14 rounded-2xl pl-12 text-base" />
                </div>
              </div>
            </StepShell>
          ) : null}

          {step === 3 ? (
            <StepShell title="For how many?" description="Use your best guest count estimate. Kids under 10 can be counted separately later.">
              <div className="mx-auto flex max-w-md items-center justify-between rounded-[28px] border border-border/70 bg-muted/20 px-6 py-5">
                <div className="flex items-center gap-3 text-lg font-semibold">
                  <Users className="h-5 w-5 text-primary" />
                  Adults
                </div>
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => setGuests((value) => Math.max(1, value - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-xl font-semibold">{guests}</span>
                  <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => setGuests((value) => value + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </StepShell>
          ) : null}

          {step === 4 ? (
            <StepShell title="What type of event are you planning?" description="Give chefs enough context to shape menus and service style.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {eventTypes.map((type) => (
                  <OptionButton key={type} selected={eventType === type} onClick={() => setEventType(type)} icon={<CalendarDays className="h-5 w-5" />} title={type} />
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 5 ? (
            <StepShell title="Type of food?" description="Choose the dining format or number of courses you have in mind.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {courseTypes.map((type) => (
                  <OptionButton key={type} selected={courseType === type} onClick={() => setCourseType(type)} icon={<Utensils className="h-5 w-5" />} title={type} />
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 6 ? (
            <StepShell title="Pricing" description="Choose a range and add a total budget so chefs can respond appropriately.">
              <div className="grid gap-3 lg:grid-cols-3">
                {pricingTiers.map((tier) => (
                  <OptionButton key={tier.label} selected={pricingTier === tier.label} onClick={() => setPricingTier(tier.label)} icon={<ChefHat className="h-5 w-5" />} title={tier.label} description={`${tier.budget}. ${tier.helper}.`} />
                ))}
              </div>
              <div className="mt-6">
                <label htmlFor="guided-budget" className="text-sm font-semibold text-foreground">Total budget</label>
                <Input id="guided-budget" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Enter your preferred total budget" className="mt-2 h-14 rounded-2xl text-base" />
              </div>
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
                  return (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() => toggleCuisine(cuisine)}
                      className={cn(
                        "rounded-full border px-5 py-3 text-sm font-semibold transition-colors",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-background hover:border-primary/50",
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
            <StepShell title={`See ${chefs.length || "matching"} available chefs`} description="Your discovery details are ready. Sign in or create a customer account to save the request, compare proposals, and chat securely.">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-5 md:grid-cols-2">
                  {chefs.slice(0, 4).map((chef) => (
                    <PublicChefCard key={chef.id} chef={chef} />
                  ))}
                  {chefSearchUnavailable ? (
                    <div className="rounded-[28px] border border-border/60 bg-muted/20 p-6 text-sm leading-6 text-muted-foreground md:col-span-2">
                      The public chef catalogue is temporarily unavailable, but your request path is ready. Continue to customer access to create the request and review matching chefs when data is available.
                    </div>
                  ) : chefs.length === 0 ? (
                    <div className="rounded-[28px] border border-border/60 bg-muted/20 p-6 text-sm leading-6 text-muted-foreground md:col-span-2">
                      No chefs matched these details yet. Continue to customer access to save the request, or browse with broader filters.
                    </div>
                  ) : null}
                </div>
                <aside className="rounded-[28px] border border-border/60 bg-muted/20 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">Next step</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Save your request</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Customer access lets you keep reviews, proposals, messages, and booking coordination inside the platform.
                  </p>
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
                  {step === 7 ? "Skip" : "Next"}
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
