"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Edit } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import axios from "axios";

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  maxBookings: number;
  currentBookings: number;
  recurringPattern?: string;
}

interface AvailabilityCalendarProps {
  chefId?: string;
  readonly?: boolean;
}

export function AvailabilityCalendar({ chefId, readonly = false }: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [formData, setFormData] = useState({
    startTime: "09:00",
    endTime: "17:00",
    maxBookings: "1",
    recurringPattern: "",
  });

  useEffect(() => {
    fetchAvailability();
  }, [currentMonth, chefId]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const month = format(currentMonth, "yyyy-MM");
      const params = new URLSearchParams({ month });
      if (chefId) params.append("chefId", chefId);

      const response = await axios.get(`/api/availability?${params}`);
      setAvailability(response.data || []);
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAvailability = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("/api/availability", {
        date: format(selectedDate, "yyyy-MM-dd"),
        ...formData,
      });
      toast.success("Availability added successfully!");
      setIsDialogOpen(false);
      setFormData({ startTime: "09:00", endTime: "17:00", maxBookings: "1", recurringPattern: "" });
      fetchAvailability();
    } catch (error: any) {
      console.error("Error creating availability:", error);
      toast.error(error.response?.data?.error || "Failed to add availability");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAvailability = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this availability slot?")) return;

    try {
      await axios.delete(`/api/availability/${slotId}`);
      toast.success("Availability deleted successfully!");
      fetchAvailability();
    } catch (error: any) {
      console.error("Error deleting availability:", error);
      toast.error(error.response?.data?.error || "Failed to delete availability");
    }
  };

  const getAvailabilityForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.filter(slot => slot.date === dateStr);
  };

  const isDateWithAvailability = (date: Date) => {
    return getAvailabilityForDate(date).length > 0;
  };

  const getAvailabilityStatus = (date: Date) => {
    const slots = getAvailabilityForDate(date);
    if (slots.length === 0) return null;
    
    const totalSlots = slots.reduce((sum, slot) => sum + slot.maxBookings, 0);
    const bookedSlots = slots.reduce((sum, slot) => sum + slot.currentBookings, 0);
    
    if (bookedSlots === 0) return "available";
    if (bookedSlots < totalSlots) return "partial";
    return "full";
  };

  const renderDay = (day: any) => {
    const date = new Date(day);
    const status = getAvailabilityStatus(date);
    const hasSlots = isDateWithAvailability(date);
    
    return (
      <div className="relative w-full h-full">
        <div className="text-sm">{format(date, "d")}</div>
        {hasSlots && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className={`w-2 h-2 rounded-full ${
              status === "available" ? "bg-green-500" :
              status === "partial" ? "bg-yellow-500" : "bg-red-500"
            }`} />
          </div>
        )}
      </div>
    );
  };

  const selectedDateSlots = selectedDate ? getAvailabilityForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            Previous
          </Button>
          <h3 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            Next
          </Button>
        </div>
        
        {!readonly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedDate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Availability
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Availability</DialogTitle>
                <DialogDescription>
                  Set your available time slots for {selectedDate && format(selectedDate, "MMM d, yyyy")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="maxBookings">Max Bookings</Label>
                  <Input
                    id="maxBookings"
                    type="number"
                    min="1"
                    value={formData.maxBookings}
                    onChange={(e) => setFormData({ ...formData, maxBookings: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="recurringPattern">Recurring Pattern (optional)</Label>
                  <Select
                    value={formData.recurringPattern}
                    onValueChange={(value) => setFormData({ ...formData, recurringPattern: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No recurrence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No recurrence</SelectItem>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleCreateAvailability} 
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "Adding..." : "Add Availability"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Availability Calendar</CardTitle>
            <CardDescription>
              Click on a date to view and manage time slots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
              components={{
                Day: ({ day, ...props }) => (
                  <div {...props} className={props.className}>
                    {renderDay(day)}
                  </div>
                ),
              }}
            />
            
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Partially Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Fully Booked</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a date"}
            </CardTitle>
            <CardDescription>
              Time slots for the selected date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No availability set for this date</p>
                {!readonly && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    Add Time Slot
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateSlots.map((slot) => (
                  <div key={slot.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={slot.currentBookings === 0 ? "default" : 
                                   slot.currentBookings < slot.maxBookings ? "secondary" : "destructive"}
                        >
                          {slot.currentBookings}/{slot.maxBookings}
                        </Badge>
                        {!readonly && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteAvailability(slot.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {slot.recurringPattern && (
                      <Badge variant="outline" className="text-xs">
                        {slot.recurringPattern}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
