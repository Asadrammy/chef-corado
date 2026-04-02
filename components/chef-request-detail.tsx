"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, MapPin, DollarSign, Users, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ChefRequestDetailProps {
  request: any
  session: any
}

export function ChefRequestDetail({ request, session }: ChefRequestDetailProps) {
  const [proposalPrice, setProposalPrice] = useState("")
  const [proposalMessage, setProposalMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitProposal = async () => {
    if (!proposalPrice || !proposalMessage) {
      alert("Please fill in all fields")
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
          price: parseFloat(proposalPrice),
          message: proposalMessage,
        }),
      })

      if (response.ok) {
        alert("Proposal sent successfully!")
        // Redirect back to requests list
        window.location.href = "/dashboard/chef/requests"
      } else {
        const error = await response.json()
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

  const hasProposal = request.proposals && request.proposals.length > 0

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
              <p className="text-gray-600">{request.description}</p>
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
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Budget</p>
                <p className="font-medium">${request.budget}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Guests</p>
                <p className="font-medium">TBD</p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          {request.details && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Additional Details</h3>
              <p className="text-gray-600">{request.details}</p>
            </div>
          )}

          {/* Client Information */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Client Information</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-medium text-gray-600">
                  {request.client.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{request.client.name}</p>
                <p className="text-sm text-gray-500">{request.client.email}</p>
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
              Submit a proposal for this request with your pricing and message
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Your Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter your price"
                  value={proposalPrice}
                  onChange={(e) => setProposalPrice(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="message">Proposal Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your proposal, what you'll provide, and why you're the perfect choice..."
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={4}
              />
            </div>
            <Button 
              onClick={handleSubmitProposal}
              disabled={isSubmitting}
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
              {request.proposals[0].status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="font-medium text-lg">${request.proposals[0].price}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">{request.proposals[0].status}</p>
              </div>
            </div>
            {request.proposals[0].message && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Message</p>
                <p className="text-gray-700">{request.proposals[0].message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
