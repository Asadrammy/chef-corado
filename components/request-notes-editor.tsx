"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

type RequestNotesEditorProps = {
  request: {
    id: string
    title?: string | null
    eventType: string
    details?: string | null
  }
}

export function RequestNotesEditor({ request }: RequestNotesEditorProps) {
  const router = useRouter()
  const [notes, setNotes] = React.useState(request.details ?? "")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "notes",
          details: notes,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to save notes")
      }

      toast.success("Request notes updated")
      router.replace(`/dashboard/client/requests/${request.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save notes")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="brand-card-surface rounded-[28px]">
      <CardHeader>
        <CardTitle>Update notes</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Notes can be updated after submission without changing quoted commercial fields.
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{request.title || request.eventType}</p>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[220px] rounded-xl"
              maxLength={5000}
              placeholder="Add extra notes, clarifications, or non-commercial updates for chefs."
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save notes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
