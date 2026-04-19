"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Clock, Edit2, Trash2, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface DayDetailsPanelProps {
  selectedDate: Date | undefined;
  slots: AvailabilitySlot[];
  readonly?: boolean;
  onSlotDeleted?: () => void;
  onSlotEdited?: (slot: AvailabilitySlot) => void;
  onAddSlot?: () => void;
}

export function DayDetailsPanel({
  selectedDate,
  slots,
  readonly = false,
  onSlotDeleted,
  onSlotEdited,
  onAddSlot,
}: DayDetailsPanelProps) {
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
      onSlotDeleted?.(); // Refresh
    } catch (error: any) {
      console.error("Error duplicating slot:", error);
      toast.error(error.response?.data?.error || "Failed to duplicate slot");
    }
  };

  if (!selectedDate) {
    return (
      <div className="sticky top-0 h-fit">
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Select a date to view details</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 h-fit">
      <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-6">
        {/* Date Header */}
        <div>
          <h2 className="text-xl font-semibold">
            {format(selectedDate, "MMMM d, yyyy")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {format(selectedDate, "EEEE")}
          </p>
        </div>

        {/* Time Slots */}
        <div className="space-y-3">
          {slots.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-xl">
              <Clock className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-4">
                No availability set for this date
              </p>
              {!readonly && onAddSlot && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddSlot}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Time Slot
                </Button>
              )}
            </div>
          ) : (
            <>
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="group relative bg-muted/50 rounded-xl p-4 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Time */}
                    <div className="flex items-center gap-2 flex-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">
                          {slot.startTime} – {slot.endTime}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              !slot.isAvailable
                                ? "outline"
                                : slot.currentBookings === 0
                                ? "default"
                                : slot.currentBookings < slot.maxBookings
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {!slot.isAvailable
                              ? "Blocked"
                              : `${slot.currentBookings}/${slot.maxBookings}`}
                          </Badge>
                          {slot.recurringPattern && (
                            <Badge variant="outline" className="text-xs">
                              {slot.recurringPattern}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {!readonly && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(slot)}
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDuplicate(slot)}
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(slot.id)}
                          disabled={deletingId === slot.id}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {!readonly && onAddSlot && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddSlot}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Slot
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
