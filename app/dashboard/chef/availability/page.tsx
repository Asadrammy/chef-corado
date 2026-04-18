"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { Calendar, Clock, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  currentBookings: number;
  recurringPattern?: string | null;
}

interface ChefBooking {
  id: string;
  eventDate: string;
  status: string;
  client?: {
    name?: string | null;
  };
}

interface AvailabilityStats {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  upcomingBookings: number;
}

export default function ChefAvailabilityPage() {
  const [stats, setStats] = useState<AvailabilityStats>({
    totalSlots: 0,
    availableSlots: 0,
    bookedSlots: 0,
    upcomingBookings: 0,
  });
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<ChefBooking[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailabilityData(currentMonth);
  }, [currentMonth]);

  const fetchAvailabilityData = async (monthDate: Date) => {
    try {
      const monthStr = format(monthDate, "yyyy-MM");
      const [availabilityResponse, bookingsResponse] = await Promise.all([
        axios.get(`/api/availability?month=${monthStr}`),
        axios.get("/api/bookings/chef"),
      ]);

      const nextAvailability = (availabilityResponse.data || []) as AvailabilitySlot[];
      const nextBookings = ((bookingsResponse.data?.bookings || []) as ChefBooking[]).map((booking) => ({
        ...booking,
        eventDate: typeof booking.eventDate === "string" ? booking.eventDate : new Date(booking.eventDate).toISOString(),
      }));

      const totalSlots = nextAvailability.length;
      const availableSlots = nextAvailability.reduce((sum, slot) => sum + Math.max(slot.maxBookings - slot.currentBookings, 0), 0);
      const bookedSlots = nextAvailability.reduce((sum, slot) => sum + slot.currentBookings, 0);
      const upcomingWindowStart = startOfDay(new Date());
      const upcomingWindowEnd = endOfDay(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      const upcomingBookings = nextBookings.filter((booking) => {
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
          return false;
        }

        const eventDate = new Date(booking.eventDate);
        return isWithinInterval(eventDate, {
          start: upcomingWindowStart,
          end: upcomingWindowEnd,
        });
      }).length;

      setAvailability(nextAvailability);
      setBookings(nextBookings);

      setStats({
        totalSlots,
        availableSlots,
        bookedSlots,
        upcomingBookings,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load availability stats");
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityChanged = () => {
    fetchAvailabilityData(currentMonth);
  };

  const listViewSlots = [...availability].sort((a, b) => {
    const left = `${a.date}T${a.startTime}`;
    const right = `${b.date}T${b.startTime}`;
    return left.localeCompare(right);
  });

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Availability Management</h1>
        <p className="text-gray-600">Manage your schedule and available time slots</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Slots</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSlots}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.availableSlots}</div>
            <p className="text-xs text-muted-foreground">
              Ready for booking
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booked Slots</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.bookedSlots}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.upcomingBookings}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Availability Calendar */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
              <CardDescription>
                Click on any date to add or manage time slots for that day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar
                onAvailabilityChanged={handleAvailabilityChanged}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Time Slots List</CardTitle>
              <CardDescription>
                View all your availability slots in a list format
              </CardDescription>
            </CardHeader>
            <CardContent>
              {listViewSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No time slots yet</p>
                  <p className="text-sm">Add availability from the calendar tab to start accepting bookings.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listViewSlots.map((slot) => (
                    <div key={slot.id} className="rounded-xl border border-border/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{format(new Date(`${slot.date}T00:00:00`), "EEE, MMM d, yyyy")}</p>
                          <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={slot.currentBookings === 0 ? "default" : slot.currentBookings < slot.maxBookings ? "secondary" : "destructive"}>
                            {slot.currentBookings}/{slot.maxBookings} booked
                          </Badge>
                          {slot.recurringPattern ? <Badge variant="outline">{slot.recurringPattern}</Badge> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Pro Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
            <div>
              <p className="font-medium">Set recurring availability</p>
              <p className="text-sm text-gray-600">
                Use recurring patterns for regular working hours to save time
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
            <div>
              <p className="font-medium">Block time strategically</p>
              <p className="text-sm text-gray-600">
                Set realistic time slots that include preparation and cleanup time
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
            <div>
              <p className="font-medium">Update regularly</p>
              <p className="text-sm text-gray-600">
                Keep your availability up-to-date to maintain a good response rate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
