"use client"

import * as React from "react"
import { toast } from "sonner"
import { MapPin, DollarSign, Calendar } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export type ProposalModalProps = {
  request: {
    id: string
    title?: string
    location: string
    budget: number
    eventDate: string
    details?: string | null
  }
  onSuccess?: () => void
  children: React.ReactNode
}

export function ProposalModal({ request, onSuccess, children }: ProposalModalProps) {
  const [open, setOpen] = React.useState(false)
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
          requestId: request.id,
          price: Number(price),
          message,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // SUCCESS
        toast.success("Proposal sent successfully!")
        setOpen(false)
        setPrice("")
        setMessage("")
        onSuccess?.()
      } else {
        // ERROR
        const errorMessage = data.error || data.message || "Failed to send proposal"
        const validationDetails = data.details ? 
          data.details.map((d: any) => `${d.field}: ${d.message}`).join(', ') : 
          null
        const fullErrorMessage = validationDetails ? `${errorMessage}: ${validationDetails}` : errorMessage
        setError(fullErrorMessage)
        toast.error(fullErrorMessage)
      }
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Send Proposal</DialogTitle>
          <DialogDescription>
            Submit your proposal for this event. Include your price and a message to introduce yourself to the client.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Request Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-medium text-sm text-gray-900 border-b border-gray-200 pb-2">Event Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 block text-xs font-medium mb-1">Location:</span>
                <p className="font-medium flex items-center">
                  <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                  {request.location}
                </p>
              </div>
              <div>
                <span className="text-gray-600 block text-xs font-medium mb-1">Budget:</span>
                <p className="font-medium text-green-600 flex items-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${request.budget}
                </p>
              </div>
              <div>
                <span className="text-gray-600 block text-xs font-medium mb-1">Date:</span>
                <p className="font-medium flex items-center">
                  <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                  {new Date(request.eventDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-600 block text-xs font-medium mb-1">Type:</span>
                <p className="font-medium">{request.title || 'Event'}</p>
              </div>
            </div>
            {request.details && (
              <div className="pt-3 border-t border-gray-200">
                <span className="text-gray-600 text-sm font-medium block mb-2">Client Details:</span>
                <p className="text-sm bg-white p-3 rounded border border-gray-200">{request.details}</p>
              </div>
            )}
          </div>

          {/* Proposal Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="price" className="text-sm font-medium">
                Your Price ($)
                <span className="text-xs text-gray-500 ml-2">(Positive, max $100,000, 2 decimal places)</span>
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
                <div className={cn(
                  "text-xs p-2 rounded-md border",
                  Number(price) === request.budget 
                    ? "bg-green-50 border-green-200 text-green-700"
                    : Number(price) > request.budget 
                      ? "bg-orange-50 border-orange-200 text-orange-700"
                      : "bg-blue-50 border-blue-200 text-blue-700"
                )}>
                  {Number(price) === request.budget 
                    ? "✅ Matches client budget perfectly!" 
                    : Number(price) > request.budget 
                      ? `⚠️ $${Number(price) - request.budget} over client budget`
                      : `💰 $${request.budget - Number(price)} under client budget`
                  }
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="message" className="text-sm font-medium">
                Message to Client
                <span className="text-xs text-gray-500 ml-2">(10-1000 characters)</span>
              </Label>
              <Textarea
                id="message"
                rows={5}
                value={message}
                required
                placeholder="Introduce yourself and explain why you're perfect for this event..."
                onChange={(event) => setMessage(event.target.value)}
                disabled={loading}
                className="resize-none"
                maxLength={1000}
              />
              <div className="flex justify-between items-center">
                <p className={cn(
                  "text-xs",
                  message.length < 10 ? "text-gray-500" : "text-green-600"
                )}>
                  {message.length}/10 characters minimum {message.length > 900 && `(max 1000)`}
                </p>
                {message.length >= 10 && message.length <= 1000 && (
                  <span className="text-xs text-green-600">✅ Ready to send</span>
                )}
                {message.length > 1000 && (
                  <span className="text-xs text-red-600">⚠️ Too long</span>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

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
                disabled={loading || !price || Number(price) <= 0 || Number(price) > 100000 || message.length < 10 || message.length > 1000}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  "Send Proposal"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
