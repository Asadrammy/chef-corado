"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type PublicEnquiryFormProps = {
  type: "gift-card" | "careers" | "property-manager-affiliate" | "venue-partner"
  partnerTypeLabel?: string
  messageLabel?: string
}

export function PublicEnquiryForm({
  type,
  partnerTypeLabel = "Property or venue type",
  messageLabel = "How can we help?",
}: PublicEnquiryFormProps) {
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle")
  const [error, setError] = React.useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("submitting")
    setError("")

    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    try {
      const response = await fetch("/api/public-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, type }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Unable to submit enquiry")
      }

      setStatus("success")
      event.currentTarget.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit enquiry")
      setStatus("error")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${type}-name`}>Name</Label>
          <Input id={`${type}-name`} name="name" required minLength={2} maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${type}-email`}>Email</Label>
          <Input id={`${type}-email`} name="email" type="email" required maxLength={180} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${type}-company`}>Company</Label>
          <Input id={`${type}-company`} name="company" maxLength={180} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${type}-location`}>Location</Label>
          <Input id={`${type}-location`} name="location" maxLength={180} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${type}-partnerType`}>{partnerTypeLabel}</Label>
        <Input id={`${type}-partnerType`} name="partnerType" maxLength={180} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${type}-message`}>{messageLabel}</Label>
        <Textarea id={`${type}-message`} name="message" required minLength={10} maxLength={2000} rows={5} />
      </div>

      {status === "success" ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Enquiry received. The team can review it from the stored public enquiry audit record.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="brand-gradient-button border-0" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending..." : "Submit Enquiry"}
      </Button>
    </form>
  )
}
