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
import { Clock, Plus, Trash2, CalendarX, Ban } from "lucide-react";
import { format, addMonths, subMonths, eachDayOfInterval, startOfDay, endOfDay, parseISO, isValid } from "date-fns";
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
  onAvailabilityChanged?: () => void;
}

export function AvailabilityCalendar({ chefId, readonly = false, onAvailabilityChanged }: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkBlockOpen, setIsBulkBlockOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    reason: "",
  });
  const [formData, setFormData] = useState({
    startTime: "09:00",
    endTime: "17:00",
    maxBookings: "1",
    recurringPattern: "NONE",
    isAvailable: "true",
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

      const response = await axios.get(`/api/availability?${params.toString()}`);
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
        isAvailable: formData.isAvailable === "true",
        recurringPattern: formData.recurringPattern === "NONE" ? null : formData.recurringPattern,
      });
      toast.success(formData.isAvailable === "true" ? "Availability added successfully!" : "Date marked unavailable.");
      setIsDialogOpen(false);
      setFormData({ startTime: "09:00", endTime: "17:00", maxBookings: "1", recurringPattern: "NONE", isAvailable: "true" });
      fetchAvailability();
      onAvailabilityChanged?.();
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
      onAvailabilityChanged?.();
    } catch (error: any) {
      console.error("Error deleting availability:", error);
      toast.error(error.response?.data?.error || "Failed to delete availability");
    }
  };

  const handleBulkBlock = async () => {
    const start = parseISO(bulkFormData.startDate);
    const end = parseISO(bulkFormData.endDate);

    if (!isValid(start) || !isValid(end)) {
      toast.error("Please select valid dates");
      return;
    }

    if (start > end) {
      toast.error("Start date must be before end date");
      return;
    }

    // Limit to 30 days at a time to prevent abuse
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      toast.error("Maximum 30 days can be blocked at once");
      return;
    }

    setBulkSubmitting(true);
    try {
      // Create blocked entries for each day in the range
      const dates = eachDayOfInterval({ start, end });
      const createPromises = dates.map(date => 
        axios.post("/api/availability", {
          date: format(date, "yyyy-MM-dd"),
          startTime: "00:00",
          endTime: "23:59",
          isAvailable: false,
          maxBookings: 0,
          reason: bulkFormData.reason || undefined,
        })
      );

      await Promise.all(createPromises);
      toast.success(`Blocked ${dates.length} date(s) successfully!`);
      setIsBulkBlockOpen(false);
      setBulkFormData({
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        reason: "",
      });
      fetchAvailability();
      onAvailabilityChanged?.();
    } catch (error: any) {
      console.error("Error bulk blocking dates:", error);
      toast.error(error.response?.data?.error || "Failed to block dates");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const getAvailabilityForDate = (date: Date) => {
    // Validate the date before formatting
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return [];
    }
    
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.filter(slot => slot.date === dateStr);
  };

  const isDateWithAvailability = (date: Date) => {
    // Validate the date before processing
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }
    
    return getAvailabilityForDate(date).length > 0;
  };

  const getAvailabilityStatus = (date: Date) => {
    // Validate the date before processing
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }
    
    const slots = getAvailabilityForDate(date);
    if (slots.length === 0) return null;

    if (slots.some((slot) => !slot.isAvailable)) return "unavailable";
    
    const totalSlots = slots.reduce((sum, slot) => sum + slot.maxBookings, 0);
    const bookedSlots = slots.reduce((sum, slot) => sum + slot.currentBookings, 0);
    
    if (bookedSlots === 0) return "available";
    if (bookedSlots < totalSlots) return "partial";
    return "full";
  };

  const renderDay = (day: unknown) => {
    // Validate the date before formatting
    if (!day) {
      return <div className="relative w-full h-full p-2"></div>;
    }
    
    // Handle CalendarDay type by accessing the date property or using the day directly
    const dateValue = day instanceof Date ? day : (day as { date?: Date }).date;
    
    if (!dateValue || !(dateValue instanceof Date) || isNaN(dateValue.getTime())) {
      return <div className="relative w-full h-full p-2"></div>;
    }
    
    const date = new Date(dateValue);
    
    // Double-check the date is valid after creating new Date instance
    if (isNaN(date.getTime())) {
      return <div className="relative w-full h-full p-2"></div>;
    }
    
    const status = getAvailabilityStatus(date);
    const hasSlots = isDateWithAvailability(date);
    
    return (
      <div className="relative w-full h-full p-2">
        <div className="text-sm">{format(date, "d")}</div>
        {hasSlots && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className={`w-2 h-2 rounded-full ${
              status === "available" ? "bg-green-500" :
              status === "unavailable" ? "bg-slate-500" :
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
          <div className="flex items-center gap-2">
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
                    <Label htmlFor="availabilityType">Day Status</Label>
                    <Select
                      value={formData.isAvailable}
                      onValueChange={(value) => setFormData({ ...formData, isAvailable: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Available</SelectItem>
                        <SelectItem value="false">Unavailable / blocked</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="NONE">No recurrence</SelectItem>
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

            {/* Bulk Block Dialog */}
            <Dialog open={isBulkBlockOpen} onOpenChange={setIsBulkBlockOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Ban className="h-4 w-4 mr-2" />
                  Bulk Block
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Block Date Range</DialogTitle>
                  <DialogDescription>
                    Block multiple dates at once (e.g., for vacations or time off)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={bulkFormData.startDate}
                        onChange={(e) => setBulkFormData({ ...bulkFormData, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={bulkFormData.endDate}
                        onChange={(e) => setBulkFormData({ ...bulkFormData, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="reason">Reason (optional)</Label>
                    <Input
                      id="reason"
                      type="text"
                      placeholder="e.g., Vacation, Conference, Personal time"
                      value={bulkFormData.reason}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, reason: e.target.value })}
                    />
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                    <CalendarX className="h-4 w-4 inline-block mr-2" />
                    This will block all dates in the selected range. Maximum 30 days at a time.
                  </div>
                  
                  <Button 
                    onClick={handleBulkBlock} 
                    disabled={bulkSubmitting}
                    variant="destructive"
                    className="w-full"
                  >
                    {bulkSubmitting ? "Blocking..." : "Block Dates"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                DayButton: ({ day, className, onClick, disabled }: any) => (
                  <button
                    className={className}
                    onClick={onClick}
                    disabled={disabled}
                    type="button"
                  >
                    {renderDay(day)}
                  </button>
                ),
              }}
            />
            
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                <span>Unavailable</span>
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
                          variant={!slot.isAvailable ? "outline" : slot.currentBookings === 0 ? "default" : 
                                   slot.currentBookings < slot.maxBookings ? "secondary" : "destructive"}
                        >
                          {!slot.isAvailable ? "Blocked" : `${slot.currentBookings}/${slot.maxBookings}`}
                        </Badge>
                        {!readonly && (
                          <div className="flex gap-1">
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
