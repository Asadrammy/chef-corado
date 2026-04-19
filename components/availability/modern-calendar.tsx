"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addMonths, subMonths, eachMonthOfInterval, startOfYear, endOfYear } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
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

interface ModernCalendarProps {
  chefId?: string;
  readonly?: boolean;
  onAvailabilityChanged?: () => void;
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date | undefined;
}

export function ModernCalendar({
  chefId,
  readonly = false,
  onAvailabilityChanged,
  onDateSelect,
  selectedDate: externalSelectedDate,
}: ModernCalendarProps) {
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedDate = externalSelectedDate || internalSelectedDate;

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
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityForDate = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return [];
    }
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.filter(slot => slot.date === dateStr);
  };

  const isDateWithAvailability = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }
    return getAvailabilityForDate(date).length > 0;
  };

  const getAvailabilityStatus = (date: Date) => {
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
    if (!day) {
      return <div className="relative w-full h-full p-2" />;
    }
    
    const dateValue = day instanceof Date ? day : (day as { date?: Date }).date;
    
    if (!dateValue || !(dateValue instanceof Date) || isNaN(dateValue.getTime())) {
      return <div className="relative w-full h-full p-2" />;
    }
    
    const date = new Date(dateValue);
    
    if (isNaN(date.getTime())) {
      return <div className="relative w-full h-full p-2" />;
    }
    
    const status = getAvailabilityStatus(date);
    const hasSlots = isDateWithAvailability(date);
    const isSelected = selectedDate && format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
    const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
    
    return (
      <div className="relative w-full h-full p-2">
        <div className={`text-sm font-medium transition-colors ${
          isSelected ? "text-white" : isToday ? "text-primary" : ""
        }`}>
          {format(date, "d")}
        </div>
        {hasSlots && (
          <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 flex gap-0.5">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
              status === "available" ? "bg-emerald-500" :
              status === "unavailable" ? "bg-slate-400" :
              status === "partial" ? "bg-amber-400" : "bg-rose-500"
            }`} />
          </div>
        )}
      </div>
    );
  };

  const handleMonthSelect = (monthValue: string) => {
    const [year, month] = monthValue.split("-").map(Number);
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setInternalSelectedDate(today);
    onDateSelect?.(today);
  };

  const months = eachMonthOfInterval({
    start: startOfYear(currentMonth),
    end: endOfYear(currentMonth),
  });

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-9 w-9 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Select
            value={format(currentMonth, "yyyy-MM")}
            onValueChange={handleMonthSelect}
          >
            <SelectTrigger className="w-[140px] h-9 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem
                  key={format(month, "yyyy-MM")}
                  value={format(month, "yyyy-MM")}
                >
                  {format(month, "MMMM yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-9 w-9 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-9 ml-2"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-2xl border shadow-sm p-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            setInternalSelectedDate(date);
            onDateSelect?.(date);
          }}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="rounded-md border-0"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
            day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors",
            day_range_end: "rounded-r-md",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            day_today: "bg-accent/50 text-accent-foreground font-semibold",
            day_outside: "text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
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

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Partially Booked</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Fully Booked</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Unavailable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
