"use client";

import { useState, useEffect } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, subWeeks } from "date-fns";
import { toast } from "sonner";
import axios from "axios";
import { motion } from "framer-motion";
import { ProductHeader } from "@/components/availability/product-header";
import { ElegantStats } from "@/components/availability/elegant-stats";
import { ProductCalendar } from "@/components/availability/product-calendar";
import { AlivePanel } from "@/components/availability/alive-panel";
import { ModernAddDialog } from "@/components/availability/modern-add-dialog";
import { ModernBulkDialog } from "@/components/availability/modern-bulk-dialog";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);

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

  const handleAddAvailability = () => {
    setEditingSlot(null);
    setIsAddDialogOpen(true);
  };

  const handleBulkBlock = () => {
    setIsBulkDialogOpen(true);
  };

  const handleCopyPreviousWeek = async () => {
    if (!selectedDate) {
      toast.error("Please select a date first");
      return;
    }

    try {
      const previousWeekDate = subWeeks(selectedDate, 1);
      const monthStr = format(previousWeekDate, "yyyy-MM");
      const response = await axios.get(`/api/availability?month=${monthStr}`);
      const previousWeekSlots = response.data || [];

      if (previousWeekSlots.length === 0) {
        toast.error("No availability found for previous week");
        return;
      }

      const createPromises = previousWeekSlots.map((slot: AvailabilitySlot) => {
        const slotDate = new Date(slot.date);
        const daysDiff = Math.floor((selectedDate.getTime() - previousWeekDate.getTime()) / (1000 * 60 * 60 * 24));
        const newDate = new Date(slotDate.getTime() + daysDiff * 24 * 60 * 60 * 1000);
        
        return axios.post("/api/availability", {
          date: format(newDate, "yyyy-MM-dd"),
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxBookings: slot.maxBookings,
          isAvailable: slot.isAvailable,
          recurringPattern: null,
        });
      });

      await Promise.all(createPromises);
      toast.success(`Copied ${previousWeekSlots.length} slot(s) from previous week`);
      handleAvailabilityChanged();
    } catch (error: any) {
      console.error("Error copying previous week:", error);
      toast.error(error.response?.data?.error || "Failed to copy previous week");
    }
  };

  const handleClearAvailability = async () => {
    if (!confirm("Are you sure you want to clear all availability for this month?")) return;

    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      const response = await axios.get(`/api/availability?month=${monthStr}`);
      const slots = response.data || [];

      const deletePromises = slots.map((slot: AvailabilitySlot) =>
        axios.delete(`/api/availability/${slot.id}`)
      );

      await Promise.all(deletePromises);
      toast.success(`Cleared ${slots.length} slot(s)`);
      handleAvailabilityChanged();
    } catch (error: any) {
      console.error("Error clearing availability:", error);
      toast.error(error.response?.data?.error || "Failed to clear availability");
    }
  };

  const handleSlotEdited = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setIsAddDialogOpen(true);
  };

  const getSlotsForSelectedDate = () => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return availability.filter(slot => slot.date === dateStr);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="h-16 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="h-96 bg-gray-200 rounded-3xl animate-pulse" />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Product Header */}
      <ProductHeader
        onAddAvailability={handleAddAvailability}
        onBulkBlock={handleBulkBlock}
        onCopyPreviousWeek={handleCopyPreviousWeek}
        onClearAvailability={handleClearAvailability}
      />

      {/* Elegant Stats */}
      <ElegantStats
        totalSlots={stats.totalSlots}
        availableSlots={stats.availableSlots}
        bookedSlots={stats.bookedSlots}
        upcomingBookings={stats.upcomingBookings}
      />

      {/* Product Workspace */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="max-w-7xl mx-auto px-6 py-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Calendar - 70% */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="lg:col-span-8"
          >
            <ProductCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onMonthChange={setCurrentMonth}
              currentMonth={currentMonth}
              availability={availability}
            />
          </motion.div>

          {/* Alive Panel - 30% */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="lg:col-span-4"
          >
            <AlivePanel
              selectedDate={selectedDate}
              slots={getSlotsForSelectedDate()}
              onSlotDeleted={handleAvailabilityChanged}
              onSlotEdited={handleSlotEdited}
              onAddSlot={handleAddAvailability}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Dialogs */}
      <ModernAddDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        selectedDate={selectedDate}
        onSuccess={handleAvailabilityChanged}
        editingSlot={editingSlot}
      />

      <ModernBulkDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        onSuccess={handleAvailabilityChanged}
      />
    </div>
  );
}
