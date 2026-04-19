"use client";

import { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Edit2, Trash2, Copy, Plus, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

interface AlivePanelProps {
  selectedDate: Date | undefined;
  slots: AvailabilitySlot[];
  onSlotDeleted?: () => void;
  onSlotEdited?: (slot: AvailabilitySlot) => void;
  onAddSlot?: () => void;
}

export function AlivePanel({
  selectedDate,
  slots,
  onSlotDeleted,
  onSlotEdited,
  onAddSlot,
}: AlivePanelProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this availability slot?")) return;

    setDeletingId(slotId);
    try {
      await axios.delete(`/api/availability/${slotId}`);
      toast.success("Availability deleted successfully!");
      onSlotDeleted?.();
    } catch (error: any) {
      console.error("Error deleting availability:", error);
      toast.error(error.response?.data?.error || "Failed to delete availability");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (slot: AvailabilitySlot) => {
    onSlotEdited?.(slot);
  };

  const handleDuplicate = async (slot: AvailabilitySlot) => {
    try {
      await axios.post("/api/availability", {
        date: format(selectedDate || new Date(), "yyyy-MM-dd"),
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxBookings: slot.maxBookings,
        isAvailable: slot.isAvailable,
        recurringPattern: null,
      });
      toast.success("Slot duplicated successfully!");
      onSlotDeleted?.();
    } catch (error: any) {
      console.error("Error duplicating slot:", error);
      toast.error(error.response?.data?.error || "Failed to duplicate slot");
    }
  };

  if (!selectedDate) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="sticky top-24"
      >
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
          <div className="text-center space-y-6">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-block"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-30" />
                <CalendarIcon className="h-16 w-16 text-gray-300 relative" />
              </div>
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Select a Date
              </h3>
              <p className="text-gray-500">
                Click on any date in the calendar to view and manage time slots
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="sticky top-24 space-y-6"
    >
      {/* Date Header Card */}
      <motion.div
        layout
        className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl shadow-xl shadow-indigo-500/30 p-8 text-white"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-200 text-sm font-medium">
            <CalendarIcon className="h-4 w-4" />
            {format(selectedDate, "EEEE")}
          </div>
          <h2 className="text-3xl font-bold">
            {format(selectedDate, "MMMM d, yyyy")}
          </h2>
          <p className="text-indigo-200">
            {slots.length} time slot{slots.length !== 1 ? 's' : ''} configured
          </p>
        </div>
      </motion.div>

      {/* Time Slots */}
      <AnimatePresence mode="popLayout">
        {slots.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100"
          >
            <div className="text-center space-y-6">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Clock className="h-12 w-12 mx-auto text-gray-300" />
              </motion.div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  No Availability Set
                </h3>
                <p className="text-gray-500">
                  Add your first time slot to start accepting bookings
                </p>
              </div>
              {onAddSlot && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={onAddSlot}
                    size="lg"
                    className="gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30"
                  >
                    <Sparkles className="h-4 w-4" />
                    Add Time Slot
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {slots.map((slot, index) => (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-5 border border-gray-100 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Time */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 group-hover:from-indigo-100 group-hover:to-purple-100 transition-colors">
                      <Clock className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-gray-900">
                        {slot.startTime} – {slot.endTime}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`
                          px-3 py-1 rounded-full text-xs font-medium
                          ${!slot.isAvailable 
                            ? 'bg-gray-100 text-gray-600' 
                            : slot.currentBookings === 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : slot.currentBookings < slot.maxBookings
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                          }
                        `}>
                          {!slot.isAvailable
                            ? "Blocked"
                            : `${slot.currentBookings}/${slot.maxBookings} booked`}
                        </span>
                        {slot.recurringPattern && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {slot.recurringPattern}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(slot)}
                      className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDuplicate(slot)}
                      className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4 text-gray-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(slot.id)}
                      disabled={deletingId === slot.id}
                      className="p-2 rounded-xl hover:bg-rose-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}

            {onAddSlot && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={onAddSlot}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 rounded-2xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Slot
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
