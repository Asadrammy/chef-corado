"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { Calendar, Clock, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get current month availability
      const currentMonth = new Date();
      const monthStr = currentMonth.toISOString().slice(0, 7); // YYYY-MM
      
      const response = await axios.get(`/api/availability?month=${monthStr}`);
      const availability = response.data || [];
      
      const totalSlots = availability.length;
      const availableSlots = availability.reduce((sum: number, slot: any) => {
        return sum + (slot.maxBookings - slot.currentBookings);
      }, 0);
      const bookedSlots = availability.reduce((sum: number, slot: any) => {
        return sum + slot.currentBookings;
      }, 0);
      
      // Get upcoming bookings (this would need to be implemented)
      const upcomingBookings = 0; // Placeholder

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
              <AvailabilityCalendar />
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
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>List view coming soon</p>
                <p className="text-sm">Use the calendar view to manage your availability</p>
              </div>
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
