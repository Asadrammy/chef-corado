"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, MapPin, Wallet, Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/currency"
import { getServiceTypeLabel } from "@/lib/request-options"
import { PROPOSAL_MESSAGE_MAX_LENGTH, PROPOSAL_MESSAGE_MIN_LENGTH } from "@/lib/proposal-message"
import type { ChefRequestView } from "@/lib/chef-request-view"

type ProposalErrorPayload = {
  error?: string
}

interface ChefRequestDetailProps {
  request: ChefRequestView & {
    status?: string
    totalProposalCount?: number
    proposals?: Array<{
      id: string
      price: number
      message?: string | null
      status: string
      createdAt: string
      lineItems?: Array<{
        id: string
        serviceDate?: string | null
        title: string
        description?: string | null
        price: number
        currency?: string | null
      }>
    }>
  }
  session?: any
}

export function ChefRequestDetail({ request }: ChefRequestDetailProps) {
  const [proposalPrice, setProposalPrice] = useState("")
  const [proposalMessage, setProposalMessage] = useState("")
  const [lineItemPrices, setLineItemPrices] = useState<Record<string, string>>(
    Object.fromEntries((request.multiDayDates ?? []).map((date: any) => [date.id, ""]))
  )
  const [lineItemNotes, setLineItemNotes] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const trimmedProposalMessageLength = proposalMessage.trim().length
  const isMultiDay = request.requestMode === "MULTI_DAY" && request.multiDayDates?.length > 0
  const lineItemTotal = isMultiDay
    ? request.multiDayDates.reduce((sum: number, date: any) => sum + Number(lineItemPrices[date.id] || 0), 0)
    : Number(proposalPrice || 0)
  const clientGreetingName = request.clientGreetingName || request.clientName || "Client"

  const handleSubmitProposal = async () => {
    if ((!isMultiDay && !proposalPrice) || trimmedProposalMessageLength < PROPOSAL_MESSAGE_MIN_LENGTH) {
      alert("Please fill in all fields")
      return
    }

    if (isMultiDay && request.multiDayDates.some((date: any) => !Number(lineItemPrices[date.id] || 0))) {
      alert("Please add a price for every Multi-Day service date")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.id,
          price: isMultiDay ? lineItemTotal : parseFloat(proposalPrice),
          message: proposalMessage,
          lineItems: isMultiDay ? request.multiDayDates.map((date: any) => ({
            serviceDate: date.date,
            title: `${formatRequestDate(date.date)} - ${getServiceTypeLabel(date.serviceType, date.serviceTypeLabel)}`,
            description: lineItemNotes[date.id] || date.notes || undefined,
            price: Number(lineItemPrices[date.id]),
          })) : undefined,
        }),
      })

      if (response.ok) {
        alert("Proposal sent successfully!")
        // Redirect back to requests list
        window.location.href = "/dashboard/chef/requests"
      } else {
        const error = (await response.json()) as ProposalErrorPayload
        alert(error.error || "Failed to send proposal")
      }
    } catch (error) {
      alert("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const eventDate = new Date(request.eventDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const proposals = request.proposals ?? []
  const hasProposal = proposals.length > 0
  const quoteLimitReached = (request.totalProposalCount ?? 0) >= 10
  const serviceTypeLabel = getServiceTypeLabel(request.serviceType, request.serviceTypeLabel)
  const cuisineLabels = request.cuisinePreferences ?? []
  const dietaryLabels = request.dietaryRequirements ?? []
  const answerSummary = request.serviceSpecificAnswerSummary ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/chef/requests">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </Link>
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{request.title}</CardTitle>
              <p className="text-gray-600">{request.description || request.details}</p>
            </div>
            <Badge variant="outline" className="text-sm">
              {request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Request Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Event Date</p>
                <p className="font-medium">{eventDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{request.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Budget</p>
                <p className="font-medium">{formatCurrency(request.budget, request.currency ?? "GBP")}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Guests</p>
                <p className="font-medium">{request.actualAttendeeCount ?? request.guestCount ?? "TBD"}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t pt-6">
            <Badge variant="secondary">{request.eventType ?? "Event"}</Badge>
            <Badge variant="outline">{serviceTypeLabel}</Badge>
            {isMultiDay ? <Badge variant="outline">{request.multiDayDates.length} service dates</Badge> : null}
            <Badge variant="outline">{request.totalProposalCount ?? 0}/10 quotes received</Badge>
            {quoteLimitReached ? (
              <Badge variant="destructive">Quote limit reached</Badge>
            ) : null}
          </div>
          <p className="text-sm text-gray-500">
            Each client request can receive up to 10 quotes total across the platform.
          </p>

          {/* Additional Details */}
          {request.details && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Additional Details</h3>
              <p className="text-gray-600">{request.details}</p>
            </div>
          )}

          {request.photos?.length ? (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Request Photos</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {request.photos.map((photo: any) => (
                  <div key={photo.id} className="relative h-36 overflow-hidden rounded-xl">
                    <Image
                      src={photo.url}
                      alt={photo.originalName ?? "Request photo"}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t pt-6 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client</p>
                <p className="mt-1 font-semibold">{clientGreetingName}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service</p>
                <p className="mt-1 font-semibold">{serviceTypeLabel}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cuisine</p>
                <p className="mt-1">{cuisineLabels.length ? cuisineLabels.join(", ") : "Not specified"}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dietary</p>
                <p className="mt-1">{dietaryLabels.length ? dietaryLabels.join(", ") : "None selected"}</p>
              </div>
            </div>

            {answerSummary.length ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Request Requirements</p>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  {answerSummary.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {isMultiDay ? (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Multi-Day Service Dates</h3>
              <div className="space-y-3">
                {request.multiDayDates.map((date: any) => (
                  <div key={date.id} className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold">{formatRequestDate(date.date)}</p>
                      <Badge variant="outline">{getServiceTypeLabel(date.serviceType, date.serviceTypeLabel)}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{date.startTime ?? "Time pending"}{date.endTime ? `-${date.endTime}` : ""}</p>
                    <p className="mt-2">{parseTagList(date.cuisineTypes).join(", ") || "Cuisine not specified"}</p>
                    <p className="text-muted-foreground">{parseTagList(date.dietaryRequirements).join(", ") || "No dietary requirements selected"}</p>
                    <p className="text-muted-foreground">{date.actualAttendeeCount ?? request.guestCount} attendees{date.billableGuestCount ? ` - ${date.billableGuestCount} billable` : ""}</p>
                    {date.budget ? <p className="mt-1 font-medium">{formatCurrency(date.budget, request.currency ?? "GBP")} client daily budget</p> : null}
                    {date.notes ? <p className="mt-2 text-muted-foreground">{date.notes}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Client Information */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Client Information</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-medium text-gray-600">
                  {clientGreetingName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{clientGreetingName}</p>
                <p className="text-sm text-gray-500">Safe greeting name for proposal personalization</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposal Section */}
      {!hasProposal && (
        <Card>
          <CardHeader>
            <CardTitle>Send Proposal</CardTitle>
            <p className="text-gray-600">
              Submit your pricing and message for this request. This request can receive up to 10 quotes total.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {quoteLimitReached ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Quote limit reached. This request is no longer accepting proposals.
              </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isMultiDay ? (
                <div className="md:col-span-2 space-y-3">
                  {request.multiDayDates.map((date: any) => (
                    <div key={date.id} className="grid gap-3 rounded-xl border border-border p-3 md:grid-cols-[1fr_150px]">
                      <div>
                        <Label>{formatRequestDate(date.date)}</Label>
                        <p className="text-sm text-muted-foreground">{getServiceTypeLabel(date.serviceType, date.serviceTypeLabel)}</p>
                        <Textarea
                          className="mt-2"
                          placeholder="Daily proposal note"
                          value={lineItemNotes[date.id] ?? ""}
                          onChange={(event) => setLineItemNotes((current) => ({ ...current, [date.id]: event.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`price-${date.id}`}>Price ({request.currency ?? "GBP"})</Label>
                        <Input
                          id={`price-${date.id}`}
                          type="number"
                          min={1}
                          value={lineItemPrices[date.id] ?? ""}
                          onChange={(event) => setLineItemPrices((current) => ({ ...current, [date.id]: event.target.value }))}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                    Total proposal: <span className="font-semibold">{formatCurrency(lineItemTotal, request.currency ?? "GBP")}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="price">Your Price ({request.currency ?? "GBP"})</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="Enter your price"
                    value={proposalPrice}
                    onChange={(e) => setProposalPrice(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="message">Proposal Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your proposal, what you'll provide, and why you're the perfect choice..."
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={7}
                className="resize-y"
                maxLength={PROPOSAL_MESSAGE_MAX_LENGTH}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {trimmedProposalMessageLength}/{PROPOSAL_MESSAGE_MIN_LENGTH} characters minimum {trimmedProposalMessageLength > PROPOSAL_MESSAGE_MAX_LENGTH - 1000 ? `(max ${PROPOSAL_MESSAGE_MAX_LENGTH})` : ""}
            </div>
            <Button 
              onClick={handleSubmitProposal}
              disabled={isSubmitting || quoteLimitReached || trimmedProposalMessageLength < PROPOSAL_MESSAGE_MIN_LENGTH}
              className="w-full md:w-auto"
            >
              {isSubmitting ? "Sending..." : "Send Proposal"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing Proposal */}
      {hasProposal && (
        <Card>
          <CardHeader>
            <CardTitle>Your Proposal</CardTitle>
            <Badge className="bg-green-100 text-green-800">
              {proposals[0].status}
            </Badge>
          </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="font-medium text-lg">{formatCurrency(proposals[0].price, request.currency ?? "GBP")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">{proposals[0].status}</p>
              </div>
            </div>
            {proposals[0].message && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Message</p>
                <p className="text-gray-700">{proposals[0].message}</p>
              </div>
            )}
            {proposals[0].lineItems?.length ? (
              <div>
                <p className="text-sm text-gray-500 mb-2">Daily breakdown</p>
                <div className="space-y-2">
                  {proposals[0].lineItems.map((item: any) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
                      </div>
                      <p className="font-semibold">{formatCurrency(item.price, item.currency ?? request.currency ?? "GBP")}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatRequestDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function parseTagList(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean)
  }
  return []
}
