"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

export type ProposalFormProps = {
  requestId: string
  onSuccess?: () => void
}

export function ProposalForm({ requestId, onSuccess }: ProposalFormProps) {
  const [price, setPrice] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          price: Number(price),
          message,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.error || "Unable to send proposal"
        throw new Error(message)
      }

      setPrice("")
      setMessage("")
      toast.success("Proposal submitted")
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="proposalPrice">Price</Label>
          <Input
            id="proposalPrice"
            type="number"
            min={0}
            step="0.01"
            value={price}
            required
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proposalMessage">Message</Label>
          <Textarea
            id="proposalMessage"
            rows={4}
            value={message}
            required
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Separator />

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending..." : "Send proposal"}
      </Button>
    </form>
  )
}
