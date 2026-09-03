"use client";

import { useState, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

interface ProductCalendarProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onMonthChange: (date: Date) => void;
  currentMonth: Date;
  availability: AvailabilitySlot[];
}

export function ProductCalendar({
  selectedDate,
  onDateSelect,
  onMonthChange,
  currentMonth,
  availability,
}: ProductCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAvailabilityForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.filter(slot => slot.date === dateStr);
  };

  const getAvailabilityStatus = (date: Date) => {
    const slots = getAvailabilityForDate(date);
    if (slots.length === 0) return "available-default";

    if (slots.some((slot) => !slot.isAvailable)) return "unavailable";
    
    const totalSlots = slots.reduce((sum, slot) => sum + slot.maxBookings, 0);
    const bookedSlots = slots.reduce((sum, slot) => sum + slot.currentBookings, 0);
    
    if (bookedSlots === 0) return "available";
    if (bookedSlots < totalSlots) return "partial";
    return "full";
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "available": return "bg-emerald-500/20 text-emerald-700 border-emerald-500/30";
      case "available-default": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "partial": return "bg-amber-500/20 text-amber-700 border-amber-500/30";
      case "full": return "bg-rose-500/20 text-rose-700 border-rose-500/30";
      case "unavailable": return "bg-slate-300 text-slate-700 border-slate-400";
      default: return "";
    }
  };

  const getStatusDot = (status: string | null) => {
    switch (status) {
      case "available": return "bg-emerald-500";
      case "available-default": return "bg-emerald-300";
      case "partial": return "bg-amber-500";
      case "full": return "bg-rose-500";
      case "unavailable": return "bg-slate-400";
      default: return "bg-transparent";
    }
  };

  const isDateSelected = selectedDate ? isSameDay(currentMonth, selectedDate) : false;

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </motion.button>

        <h2 className="text-2xl font-semibold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </motion.button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            const status = getAvailabilityStatus(date);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isHovered = hoveredDate && isSameDay(date, hoveredDate);

            return (
              <motion.div
                key={date.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.01 }}
                onHoverStart={() => setHoveredDate(date)}
                onHoverEnd={() => setHoveredDate(null)}
                onClick={() => onDateSelect(date)}
                className={`
                  relative aspect-square rounded-2xl cursor-pointer
                  transition-all duration-300 ease-out
                  ${isSelected 
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/30 scale-105' 
                    : isHovered
                    ? 'bg-gray-100 scale-105'
                    : isTodayDate
                    ? 'bg-emerald-50 text-emerald-900'
                    : 'hover:bg-gray-50'
                  }
                  ${!isCurrentMonth ? 'opacity-30' : ''}
                `}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`
                    text-lg font-semibold
                    ${isSelected ? 'text-white' : isTodayDate ? 'text-emerald-700' : 'text-gray-700'}
                  `}>
                    {format(date, "d")}
                  </span>
                  
                  {status && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mt-1.5"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(status)}`} />
                    </motion.div>
                  )}
                </div>

                {isTodayDate && !isSelected && (
                  <div className="absolute top-1.5 right-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-300" />
            <span className="text-xs text-gray-600">Available by default</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-600">Available with time limit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-gray-600">Partially Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-xs text-gray-600">Fully Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span className="text-xs text-gray-600">Blocked / Unavailable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
