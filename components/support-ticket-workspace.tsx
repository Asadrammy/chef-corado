"use client"

import { useEffect, useMemo, useState } from "react"
import { LifeBuoy, Loader2, MessageSquarePlus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type SupportTicket = {
  id: string
  category: string
  priority: string
  status: string
  subject: string
  description: string
  resolution?: string | null
  createdAt: string
  messages: Array<{ id: string; senderRole?: string | null; message: string; createdAt: string }>
}

const categories = ["BOOKING", "PAYMENT", "REFUND", "DISPUTE", "ACCOUNT", "COMPLIANCE", "TECHNICAL", "OTHER"]
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"]

export function SupportTicketWorkspace({ roleLabel }: { roleLabel: string }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    category: "BOOKING",
    priority: "NORMAL",
    subject: "",
    description: "",
  })

  const openCount = useMemo(() => tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length, [tickets])

  async function loadTickets() {
    setLoading(true)
    try {
      const response = await fetch("/api/support-tickets", { cache: "no-store" })
      if (!response.ok) throw new Error("Unable to load support tickets")
      const payload = await response.json()
      setTickets(payload.tickets ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load support tickets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  async function submitTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to create support ticket")
      }

      toast.success("Support ticket created")
      setForm({ category: "BOOKING", priority: "NORMAL", subject: "", description: "" })
      await loadTickets()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create support ticket")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <LifeBuoy className="size-4" />
              {roleLabel} support
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Support Tickets</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create a ticket, track status, and review visible support responses. Live chat is not enabled.
            </p>
          </div>
          <div className="rounded-md border border-border px-4 py-3 text-sm">
            <p className="font-semibold">{openCount} open</p>
            <p className="text-muted-foreground">{tickets.length} total tickets</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquarePlus className="size-5" />
              New Ticket
            </CardTitle>
            <CardDescription>Use platform tickets for support. Do not share payment details in messages.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitTicket} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(value) => setForm((current) => ({ ...current, priority: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{priorities.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-subject">Subject</Label>
                <Input id="support-subject" value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-description">Message</Label>
                <Textarea id="support-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={6} required />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Create ticket
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Your Tickets</CardTitle>
              <CardDescription>Status and visible support responses.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadTickets} disabled={loading}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 rounded-md border border-border p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading tickets
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No support tickets yet.</div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{ticket.category} - {new Date(ticket.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{ticket.priority}</Badge>
                      <Badge>{ticket.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{ticket.description}</p>
                  {ticket.resolution ? <p className="mt-3 rounded-md bg-muted p-3 text-sm">{ticket.resolution}</p> : null}
                  {ticket.messages.length > 0 ? (
                    <div className="mt-4 space-y-2 border-t border-border pt-3">
                      {ticket.messages.map((message) => (
                        <p key={message.id} className="text-xs leading-5 text-muted-foreground">
                          <span className="font-medium text-foreground">{message.senderRole ?? "Support"}:</span> {message.message}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
