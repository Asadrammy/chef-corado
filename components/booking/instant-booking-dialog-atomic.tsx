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
import { CalendarIcon, Clock, Users, Wallet, MapPin, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { formatCurrency } from "@/lib/currency";

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

interface InstantBookingDialogAtomicProps {
  experience: Experience;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingComplete?: (booking: any) => void;
}

export function InstantBookingDialogAtomic({ 
  experience, 
  open, 
  onOpenChange, 
  onBookingComplete 
}: InstantBookingDialogAtomicProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [guestCount, setGuestCount] = useState("2");
  const [location, setLocation] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [bookingId, setBookingId] = useState<string | null>(null);

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

  const handleAtomicBooking = async () => {
    if (!selectedDate || !location) {
      toast.error("Please select a date and provide a location");
      return;
    }

    if (!availability?.canBook) {
      toast.error("This date is not available for booking");
      return;
    }

    setLoading(true);
    setPaymentStatus('processing');

    try {
      // CRITICAL: Atomic payment session creation
      const response = await axios.post("/api/bookings/instant/payment-atomic", {
        experienceId: experience.id,
        eventDate: format(selectedDate, "yyyy-MM-dd"),
        location,
        guestCount: parseInt(guestCount),
        specialRequests: specialRequests || undefined,
      });

      const { url, bookingId: newBookingId, paymentId } = response.data;

      if (!url || !newBookingId || !paymentId) {
        throw new Error("Invalid payment session response");
      }

      // Store booking ID for status checking
      setBookingId(newBookingId);

      // CRITICAL: Start polling for payment status
      startPaymentStatusPolling(newBookingId);

      // Redirect to Stripe
      window.location.href = url;

    } catch (error: any) {
      console.error("Error creating atomic booking:", error);
      setPaymentStatus('error');
      
      const errorMessage = error.response?.data?.error || "Failed to create booking";
      
      // CRITICAL: Handle availability errors gracefully
      if (errorMessage.includes("availability") || errorMessage.includes("booked")) {
        toast.error("This time slot was just booked by someone else. Please select another date.");
        // Refresh availability
        if (selectedDate) {
          await checkAvailability();
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // CRITICAL: Payment status polling
  const startPaymentStatusPolling = (bookingIdToCheck: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/bookings/${bookingIdToCheck}/status`);
        const { status } = response.data;

        if (status === 'CONFIRMED') {
          clearInterval(pollInterval);
          setPaymentStatus('success');
          toast.success("Booking confirmed! You can now view your booking details.");
          onBookingComplete?.({ id: bookingIdToCheck, status: 'CONFIRMED' });
          onOpenChange(false);
        } else if (status === 'CANCELLED' || status === 'FAILED') {
          clearInterval(pollInterval);
          setPaymentStatus('error');
          toast.error("Booking was not completed. Please try again.");
        }
      } catch (error) {
        console.error("Error polling payment status:", error);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'processing') {
        setPaymentStatus('error');
        toast.error("Payment confirmation timed out. Please check your bookings page.");
      }
    }, 5 * 60 * 1000);
  };

  const totalPrice = experience.price * parseInt(guestCount);
  const canBook = selectedDate && location && availability?.canBook && paymentStatus !== 'processing';

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Don't allow closing during payment processing
      if (paymentStatus === 'processing') {
        return;
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Instant Booking</DialogTitle>
          <DialogDescription>
            Book this experience instantly with secure payment processing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Status Indicator */}
          {paymentStatus === 'processing' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Processing Payment</p>
                  <p className="text-sm text-blue-700">
                    Please wait while we process your payment...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {paymentStatus === 'success' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Payment Successful</p>
                  <p className="text-sm text-green-700">
                    Your booking has been confirmed!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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
                    <Wallet className="h-4 w-4" />
                    <span>Price</span>
                  </div>
                  <p className="font-semibold">{formatCurrency(experience.price, 'GBP')}</p>
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
                    {experience.minGuests || 1}-{experience.maxGuests || "8"}
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
                disabled={(date) => date < new Date() || paymentStatus === 'processing'}
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
                  <Select value={guestCount} onValueChange={setGuestCount} disabled={paymentStatus === 'processing'}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: (experience.maxGuests || 8) - (experience.minGuests || 1) + 1 },
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
                    disabled={paymentStatus === 'processing'}
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
                    disabled={paymentStatus === 'processing'}
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
                      <span>{formatCurrency(experience.price, 'GBP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Number of guests:</span>
                      <span>{guestCount}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total:</span>
                        <span>{formatCurrency(totalPrice, 'GBP')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Book Button */}
                <Button 
                  onClick={handleAtomicBooking} 
                  disabled={!canBook || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Book & Pay Now"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
