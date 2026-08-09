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
import { COUNTRY_OPTIONS, CUISINE_TYPES, DIETARY_REQUIREMENTS, type CountryCode } from "@/lib/request-options"

export function FullTimeChefEnquiryForm({ initialDraftId }: { initialDraftId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [country, setCountry] = React.useState<CountryCode>(COUNTRY_OPTIONS[0].value)
  const [placementType, setPlacementType] = React.useState("Temporary")
  const [liveInPreference, setLiveInPreference] = React.useState("Live-out")
  const [budgetPeriod, setBudgetPeriod] = React.useState("Monthly")
  const [cuisines, setCuisines] = React.useState<string[]>([])
  const [dietary, setDietary] = React.useState<string[]>([])
  const [form, setForm] = React.useState({
    location: "",
    desiredStartDate: "",
    expectedDuration: "",
    workingDays: "",
    workingHours: "",
    householdSize: "",
    adultCount: "",
    childrenUnder10: "",
    responsibilities: "",
    budgetAmount: "",
    travelRequirements: "",
    legalWorkRequirements: "",
    notes: "",
  })

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

  React.useEffect(() => {
    if (!initialDraftId) return
    const rawDraft = window.sessionStorage.getItem(`chefachef:request-draft:${initialDraftId}`)
    if (!rawDraft) return
    try {
      const draft = JSON.parse(rawDraft) as {
        country?: CountryCode
        location?: string
        budget?: string | number
        adultCount?: number
        childrenUnder10?: number
        cuisinePreferences?: string[]
        dietaryRequirements?: string[]
        details?: string
        fullTimeDetails?: {
          desiredStartDate?: string
          expectedDuration?: string
          liveInPreference?: string
          workingDays?: string
          workingHours?: string
          salaryPeriod?: string
        }
      }
      if (draft.country) setCountry(draft.country)
      if (Array.isArray(draft.cuisinePreferences)) setCuisines(draft.cuisinePreferences.filter((item) => (CUISINE_TYPES as readonly string[]).includes(item)).slice(0, 3))
      if (Array.isArray(draft.dietaryRequirements)) setDietary(draft.dietaryRequirements.filter((item) => (DIETARY_REQUIREMENTS as readonly string[]).includes(item)))
      if (draft.fullTimeDetails?.liveInPreference) setLiveInPreference(draft.fullTimeDetails.liveInPreference)
      if (draft.fullTimeDetails?.salaryPeriod) setBudgetPeriod(draft.fullTimeDetails.salaryPeriod)
      setForm((current) => ({
        ...current,
        location: draft.location ?? current.location,
        desiredStartDate: draft.fullTimeDetails?.desiredStartDate ?? current.desiredStartDate,
        expectedDuration: draft.fullTimeDetails?.expectedDuration ?? current.expectedDuration,
        workingDays: draft.fullTimeDetails?.workingDays ?? current.workingDays,
        workingHours: draft.fullTimeDetails?.workingHours ?? current.workingHours,
        adultCount: draft.adultCount != null ? String(draft.adultCount) : current.adultCount,
        childrenUnder10: draft.childrenUnder10 != null ? String(draft.childrenUnder10) : current.childrenUnder10,
        budgetAmount: draft.budget != null ? String(draft.budget) : current.budgetAmount,
        notes: draft.details ?? current.notes,
      }))
    } catch {
      toast.error("We could not restore the saved full-time chef draft")
    }
  }, [initialDraftId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/full-time-chef-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: form.location,
          country,
          desiredStartDate: form.desiredStartDate,
          expectedDuration: form.expectedDuration,
          placementType,
          liveInPreference,
          workingDays: form.workingDays,
          workingHours: form.workingHours,
          householdSize: form.householdSize ? Number(form.householdSize) : undefined,
          adultCount: form.adultCount ? Number(form.adultCount) : undefined,
          childrenUnder10: form.childrenUnder10 ? Number(form.childrenUnder10) : undefined,
          responsibilities: form.responsibilities || undefined,
          cuisinePreferences: cuisines,
          dietaryRequirements: dietary,
          budgetAmount: form.budgetAmount ? Number(form.budgetAmount) : undefined,
          budgetPeriod,
          travelRequirements: form.travelRequirements || undefined,
          legalWorkRequirements: form.legalWorkRequirements || undefined,
          notes: form.notes || undefined,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to submit placement enquiry")
      }

      toast.success("Full-time chef placement enquiry submitted")
      router.push("/dashboard/client")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit placement enquiry")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Full-Time Chef Placement</CardTitle></CardHeader>
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
            <Field label="Desired start date">
              <Input required type="date" min={new Date().toISOString().split("T")[0]} value={form.desiredStartDate} onChange={(event) => updateForm("desiredStartDate", event.target.value)} />
            </Field>
            <Field label="Expected duration">
              <Input required value={form.expectedDuration} onChange={(event) => updateForm("expectedDuration", event.target.value)} placeholder="3 months, 12 months, permanent" />
            </Field>
            <Field label="Temporary or permanent">
              <Select value={placementType} onValueChange={setPlacementType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Temporary">Temporary</SelectItem><SelectItem value="Permanent">Permanent</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Live-in or live-out">
              <Select value={liveInPreference} onValueChange={setLiveInPreference}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Live-in">Live-in</SelectItem><SelectItem value="Live-out">Live-out</SelectItem><SelectItem value="Flexible">Flexible</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Working days">
              <Input required value={form.workingDays} onChange={(event) => updateForm("workingDays", event.target.value)} />
            </Field>
            <Field label="Working hours">
              <Input required value={form.workingHours} onChange={(event) => updateForm("workingHours", event.target.value)} />
            </Field>
            <Field label="Household size">
              <Input type="number" min={1} value={form.householdSize} onChange={(event) => updateForm("householdSize", event.target.value)} />
            </Field>
            <Field label="Adults">
              <Input type="number" min={0} value={form.adultCount} onChange={(event) => updateForm("adultCount", event.target.value)} />
            </Field>
            <Field label="Children under 10">
              <Input type="number" min={0} value={form.childrenUnder10} onChange={(event) => updateForm("childrenUnder10", event.target.value)} />
            </Field>
            <Field label={`Salary or budget (${COUNTRY_OPTIONS.find((option) => option.value === country)?.currency})`}>
              <Input type="number" min={1} value={form.budgetAmount} onChange={(event) => updateForm("budgetAmount", event.target.value)} />
            </Field>
            <Field label="Budget period">
              <Select value={budgetPeriod} onValueChange={setBudgetPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Annual">Annual</SelectItem></SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Responsibilities">
            <Textarea value={form.responsibilities} onChange={(event) => updateForm("responsibilities", event.target.value)} />
          </Field>
          <OptionGrid title="Cuisine preferences" options={CUISINE_TYPES} selected={cuisines} onToggle={toggleCuisine} />
          <OptionGrid title="Dietary requirements" options={DIETARY_REQUIREMENTS} selected={dietary} onToggle={toggleDietary} />
          <Field label="Travel requirements">
            <Textarea value={form.travelRequirements} onChange={(event) => updateForm("travelRequirements", event.target.value)} />
          </Field>
          <Field label="Legal/work requirements">
            <Textarea value={form.legalWorkRequirements} onChange={(event) => updateForm("legalWorkRequirements", event.target.value)} />
          </Field>
          <Field label="Additional notes">
            <Textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
          </Field>
          <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit placement enquiry"}</Button>
        </CardContent>
      </Card>
      <Card className="h-fit rounded-2xl lg:sticky lg:top-24">
        <CardHeader><CardTitle className="text-base">Placement flow</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>This creates a placement enquiry, not a standard one-off booking.</p>
          <p>No Stripe checkout is shown for full-time chef enquiries.</p>
          <p>M-Pesa is noted as a future Kenya integration only and is not presented as active.</p>
        </CardContent>
      </Card>
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
