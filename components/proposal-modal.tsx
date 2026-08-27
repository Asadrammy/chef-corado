"use client"

import * as React from "react"
import { toast } from "sonner"
import { Calendar, MapPin, Image as ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { getServiceTypeLabel } from "@/lib/request-options"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { ChefRequestView } from "@/lib/chef-request-view"
import { PROPOSAL_MESSAGE_MAX_LENGTH, PROPOSAL_MESSAGE_MIN_LENGTH } from "@/lib/proposal-message"

export type ProposalModalProps = {
  request: ChefRequestView
  onSuccess?: () => void
  children: React.ReactNode
}

type ProposalErrorPayload = {
  error?: string
  details?: Array<{ field?: string; message: string }>
}

type ChefMenuOption = {
  id: string
  title: string
  cuisineType?: string
  menuType?: string
}

export function ProposalModal({ request, onSuccess, children }: ProposalModalProps) {
  const [open, setOpen] = React.useState(false)
  const [price, setPrice] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [menuId, setMenuId] = React.useState("none")
  const [menus, setMenus] = React.useState<ChefMenuOption[]>([])
  const [menusLoading, setMenusLoading] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const clientGreetingName = request.clientGreetingName || request.clientName || "Client"
  const trimmedMessageLength = message.trim().length
  const requestDateLabel = new Date(request.eventDate).toLocaleDateString()
  const serviceLabel = getServiceTypeLabel(request.serviceType, request.serviceTypeLabel)
  const isMultiDay = request.requestMode === "MULTI_DAY" && request.multiDayDates.length > 0

  React.useEffect(() => {
    if (!open) return

    let isMounted = true
    const loadMenus = async () => {
      setMenusLoading(true)
      try {
        const response = await fetch("/api/menus", {
          cache: "no-store",
          credentials: "include",
        })
        if (!response.ok) {
          throw new Error("Unable to load menus")
        }
        const payload = (await response.json()) as ChefMenuOption[]
        if (isMounted) {
          setMenus(payload)
        }
      } catch {
        if (isMounted) {
          setMenus([])
        }
      } finally {
        if (isMounted) {
          setMenusLoading(false)
        }
      }
    }

    loadMenus()
    return () => {
      isMounted = false
    }
  }, [open])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          price: Number(price),
          message,
          menuId: menuId === "none" ? null : menuId,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast.success("Proposal sent successfully")
        setOpen(false)
        setPrice("")
        setMessage("")
        setMenuId("none")
        onSuccess?.()
        return
      }

      const payload = data as ProposalErrorPayload
      const validationDetails = payload.details?.length
        ? payload.details.map((detail) => `${detail.field}: ${detail.message}`).join(", ")
        : null
      const fullErrorMessage = validationDetails ? `${payload.error || "Failed to send proposal"}: ${validationDetails}` : (payload.error || "Failed to send proposal")
      setError(fullErrorMessage)
      toast.error(fullErrorMessage)
    } catch (err) {
      console.error(err)
      const errorMessage = "Something went wrong. Please try again."
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setOpen(false)
      setError(null)
    }
  }

  const summaryItems = [
    { label: "Location", value: request.location, icon: MapPin },
    { label: "Date", value: requestDateLabel, icon: Calendar },
    { label: "Budget", value: formatCurrency(request.budget, request.currency), icon: null },
    { label: "Client", value: clientGreetingName, icon: null },
    { label: "Service", value: serviceLabel, icon: null },
    request.actualAttendeeCount ?? request.guestCount ? { label: "Guests", value: String(request.actualAttendeeCount ?? request.guestCount), icon: null } : null,
    request.cuisinePreferences.length ? { label: "Cuisine", value: request.cuisinePreferences.join(", "), icon: null } : null,
    request.dietaryRequirements.length ? { label: "Dietary", value: request.dietaryRequirements.join(", "), icon: null } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: React.ComponentType<{ className?: string }> | null }>

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Send Proposal</DialogTitle>
          <DialogDescription>
            Submit your proposal with clear pricing and a message tailored to the request.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Request Summary</p>
                  <h3 className="text-base font-semibold">{request.title}</h3>
                </div>
                <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
                  {isMultiDay ? "Multi-Day" : "Standard"}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {summaryItems.map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-1 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {request.details ? (
                <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{request.details}</p>
                </div>
              ) : null}
            </section>

            {request.photos.length ? (
              <section className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">Request Photos</h3>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {request.photos.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {request.photos.slice(0, 4).map((photo) => (
                    <div key={photo.id} className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                      {photo.originalName ?? "Request photo"}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {request.multiDayDates.length ? (
              <section className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="mb-3 font-medium">Multi-Day Dates</h3>
                <div className="space-y-2">
                  {request.multiDayDates.map((day) => (
                    <div key={day.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                        <span className="text-xs text-muted-foreground">{day.serviceTypeLabel}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {day.cuisineTypes.length ? day.cuisineTypes.join(", ") : "Cuisine not specified"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-5">
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-3 font-medium">Client Context</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Hello</span> {clientGreetingName}</p>
                <p><span className="font-medium">Location:</span> {request.location}</p>
                <p><span className="font-medium">Budget:</span> {formatCurrency(request.budget, request.currency)}</p>
                {request.serviceSpecificAnswerSummary.length ? (
                  <p><span className="font-medium">Requirements:</span> {request.serviceSpecificAnswerSummary.join(" | ")}</p>
                ) : null}
              </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="price" className="text-sm font-medium">
                  Your Price ({request.currency ?? "GBP"})
                  <span className="text-xs text-gray-500 ml-2">(Positive, max 100,000, 2 decimal places)</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  value={price}
                  required
                  placeholder="Enter your price"
                  onChange={(event) => setPrice(event.target.value)}
                  disabled={loading}
                  className="text-lg"
                />
                {price && Number(price) > 0 && (
                  <div
                    className={cn(
                      "text-xs p-2 rounded-md border",
                      Number(price) === request.budget
                        ? "bg-green-50 border-green-200 text-green-700"
                        : Number(price) > request.budget
                          ? "bg-orange-50 border-orange-200 text-orange-700"
                          : "bg-blue-50 border-blue-200 text-blue-700"
                    )}
                  >
                    {Number(price) === request.budget
                      ? "Matches client budget perfectly!"
                      : Number(price) > request.budget
                        ? `${formatCurrency(Number(price) - request.budget, request.currency)} over client budget`
                        : `${formatCurrency(request.budget - Number(price), request.currency)} under client budget`}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="menuId" className="text-sm font-medium">
                  Attach a Menu
                  <span className="text-xs text-gray-500 ml-2">(Optional)</span>
                </Label>
                <Select value={menuId} onValueChange={setMenuId} disabled={loading || menusLoading}>
                  <SelectTrigger id="menuId" className="h-11">
                    <SelectValue placeholder={menusLoading ? "Loading menus..." : "Select a menu"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No menu attached</SelectItem>
                    {menus.map((menu) => (
                      <SelectItem key={menu.id} value={menu.id}>
                        {menu.title}
                        {menu.cuisineType ? ` - ${menu.cuisineType}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Attach a current menu when it helps the client understand your style.
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="message" className="text-sm font-medium">
                  Message to Client
                  <span className="text-xs text-gray-500 ml-2">({PROPOSAL_MESSAGE_MIN_LENGTH}-{PROPOSAL_MESSAGE_MAX_LENGTH} characters)</span>
                </Label>
                <Textarea
                  id="message"
                  rows={9}
                  value={message}
                  required
                  placeholder="Introduce yourself and explain why you're perfect for this event..."
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={loading}
                  className="min-h-[220px] resize-y"
                  maxLength={PROPOSAL_MESSAGE_MAX_LENGTH}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className={cn("text-xs", trimmedMessageLength < PROPOSAL_MESSAGE_MIN_LENGTH ? "text-gray-500" : "text-green-600")}>
                    {trimmedMessageLength}/{PROPOSAL_MESSAGE_MIN_LENGTH} characters minimum
                    {trimmedMessageLength > 900 ? ` (max ${PROPOSAL_MESSAGE_MAX_LENGTH})` : ""}
                  </p>
                  {trimmedMessageLength >= PROPOSAL_MESSAGE_MIN_LENGTH && message.length <= PROPOSAL_MESSAGE_MAX_LENGTH ? (
                    <span className="text-xs text-green-600">Ready to send</span>
                  ) : null}
                </div>
              </div>

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <strong>Error:</strong> {error}
                </div>
              ) : null}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !price ||
                    Number(price) <= 0 ||
                    Number(price) > 100000 ||
                    trimmedMessageLength < PROPOSAL_MESSAGE_MIN_LENGTH ||
                    message.length > PROPOSAL_MESSAGE_MAX_LENGTH
                  }
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Sending...
                    </>
                  ) : (
                    "Send Proposal"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
