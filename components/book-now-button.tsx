"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CalendarDays, MapPin, Users, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Experience {
  id: string
  title: string
  price: number
  duration: number
  maxGuests: number | null
  chef: {
    user: {
      id: string
      name: string
    }
    location: string | null
  }
}

interface BookNowButtonProps {
  experience: Experience
}

export function BookNowButton({ experience }: BookNowButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    eventDate: "",
    location: experience.chef.location || "",
    guestCount: 1,
    specialRequests: ""
  })

  const maxGuests = experience.maxGuests || 10 // Default to 10 if null

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.eventDate) {
      toast.error("Please select an event date")
      return
    }

    if (formData.guestCount < 1 || formData.guestCount > maxGuests) {
      toast.error(`Guest count must be between 1 and ${maxGuests}`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/bookings/instant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          experienceId: experience.id,
          eventDate: formData.eventDate,
          location: formData.location,
          guestCount: formData.guestCount,
          specialRequests: formData.specialRequests || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create booking")
      }

      const booking = await response.json()
      
      toast.success("Booking created successfully!")
      setOpen(false)
      
      // Redirect to client bookings page
      router.push("/dashboard/client/bookings")
      
    } catch (error) {
      console.error("Booking error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create booking")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const minDate = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          Book This Experience
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book {experience.title}</DialogTitle>
          <DialogDescription>
            Complete your booking with {experience.chef.user.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventDate">Event Date</Label>
            <Input
              id="eventDate"
              type="date"
              min={minDate}
              value={formData.eventDate}
              onChange={(e) => handleInputChange("eventDate", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="Event location"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestCount">Number of Guests</Label>
            <Input
              id="guestCount"
              type="number"
              min="1"
              max={maxGuests}
              value={formData.guestCount}
              onChange={(e) => handleInputChange("guestCount", parseInt(e.target.value))}
              required
            />
            <p className="text-sm text-muted-foreground">
              Maximum: {maxGuests} guests
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
            <Textarea
              id="specialRequests"
              value={formData.specialRequests}
              onChange={(e) => handleInputChange("specialRequests", e.target.value)}
              placeholder="Any dietary restrictions or special requirements..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium">Price per person:</span>
              <span className="text-lg font-bold">${experience.price}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium">Number of guests:</span>
              <span className="text-lg">{formData.guestCount}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium">Duration:</span>
              <span className="text-lg">{experience.duration} minutes</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  ${experience.price * formData.guestCount}
                </span>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Booking...
              </>
            ) : (
              `Complete Booking - $${experience.price * formData.guestCount}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
