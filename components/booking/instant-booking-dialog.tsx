"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarIcon, Clock, Users, DollarSign, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

interface Experience {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number;
  minGuests?: number;
  maxGuests?: number;
  chef: {
    user: {
      name: string;
      verified: boolean;
      experienceLevel: string;
    };
    location: string;
  };
}

interface InstantBookingDialogProps {
  experience: Experience;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingComplete?: (booking: any) => void;
}

export function InstantBookingDialog({ 
  experience, 
  open, 
  onOpenChange, 
  onBookingComplete 
}: InstantBookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [guestCount, setGuestCount] = useState("2");
  const [location, setLocation] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      checkAvailability();
    }
  }, [selectedDate]);

  const checkAvailability = async () => {
    if (!selectedDate) return;

    setCheckingAvailability(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await axios.get(
        `/api/bookings/instant?experienceId=${experience.id}&date=${dateStr}`
      );
      setAvailability(response.data);
    } catch (error) {
      console.error("Error checking availability:", error);
      setAvailability({ canBook: false });
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !location) {
      toast.error("Please select a date and provide a location");
      return;
    }

    if (!availability?.canBook) {
      toast.error("This date is not available for booking");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/bookings/instant", {
        experienceId: experience.id,
        eventDate: format(selectedDate, "yyyy-MM-dd"),
        location,
        guestCount,
        specialRequests: specialRequests || undefined,
      });

      toast.success("Booking created successfully!");
      onBookingComplete?.(response.data);
      onOpenChange(false);
      
      // Reset form
      setSelectedDate(undefined);
      setLocation("");
      setSpecialRequests("");
      setGuestCount("2");
      setAvailability(null);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast.error(error.response?.data?.error || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = experience.price * parseInt(guestCount);
  const canBook = selectedDate && location && availability?.canBook;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Instant Booking</DialogTitle>
          <DialogDescription>
            Book this experience instantly without waiting for chef approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Experience Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{experience.title}</CardTitle>
              <CardDescription>{experience.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Price</span>
                  </div>
                  <p className="font-semibold">${experience.price}</p>
                  <p className="text-xs text-gray-500">per person</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span>Duration</span>
                  </div>
                  <p className="font-semibold">{Math.floor(experience.duration / 60)}h {experience.duration % 60}m</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
                    <Users className="h-4 w-4" />
                    <span>Guests</span>
                  </div>
                  <p className="font-semibold">
                    {experience.minGuests || 1}-{experience.maxGuests || "∞"}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
                    <MapPin className="h-4 w-4" />
                    <span>Location</span>
                  </div>
                  <p className="font-semibold text-sm">{experience.chef.location}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Chef:</span>
                  <span>{experience.chef.user.name}</span>
                  {experience.chef.user.verified && (
                    <Badge className="bg-green-500 text-white text-xs">Verified</Badge>
                  )}
                </div>
                <Badge variant="outline">{experience.chef.user.experienceLevel}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Booking Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border mt-2"
              />
            </div>

            {selectedDate && (
              <div className="space-y-4">
                {/* Availability Status */}
                {checkingAvailability ? (
                  <Card>
                    <CardContent className="flex items-center gap-2 py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Checking availability...</span>
                    </CardContent>
                  </Card>
                ) : availability ? (
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2">
                        {availability.canBook ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-green-700">
                              Available - {availability.remainingSlots} slots remaining
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <span className="text-red-700">
                              Not available on this date
                            </span>
                          </>
                        )}
                      </div>
                      
                      {availability.availability && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Time: {availability.availability.startTime} - {availability.availability.endTime}</p>
                          <p>Capacity: {availability.availability.currentBookings}/{availability.availability.maxBookings}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {/* Guest Count */}
                <div>
                  <Label htmlFor="guestCount">Number of Guests</Label>
                  <Select value={guestCount} onValueChange={setGuestCount}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: (experience.maxGuests || 10) - (experience.minGuests || 1) + 1 },
                        (_, i) => (experience.minGuests || 1) + i
                      ).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? "Guest" : "Guests"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <Label htmlFor="location">Event Location</Label>
                  <Input
                    id="location"
                    placeholder="Enter the event address"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Special Requests */}
                <div>
                  <Label htmlFor="specialRequests">Special Requests (optional)</Label>
                  <Textarea
                    id="specialRequests"
                    placeholder="Any dietary restrictions, special arrangements, etc."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Price Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Price Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Price per person:</span>
                      <span>${experience.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Number of guests:</span>
                      <span>{guestCount}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total:</span>
                        <span>${totalPrice}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Book Button */}
                <Button 
                  onClick={handleBooking} 
                  disabled={!canBook || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Creating Booking..." : "Complete Instant Booking"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
