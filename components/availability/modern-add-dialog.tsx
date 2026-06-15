"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

interface ModernAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  onSuccess: () => void;
  editingSlot?: any;
}

export function ModernAddDialog({
  open,
  onOpenChange,
  selectedDate,
  onSuccess,
  editingSlot,
}: ModernAddDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    startTime: editingSlot?.startTime || "09:00",
    endTime: editingSlot?.endTime || "17:00",
    maxBookings: editingSlot?.maxBookings?.toString() || "1",
    isAvailable: editingSlot?.isAvailable !== undefined ? editingSlot.isAvailable.toString() : "true",
    recurringPattern: editingSlot?.recurringPattern || "NONE",
  });

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSlot) {
        await axios.put(`/api/availability/${editingSlot.id}`, {
          ...formData,
          isAvailable: formData.isAvailable === "true",
          recurringPattern: formData.recurringPattern === "NONE" ? null : formData.recurringPattern,
        });
        toast.success("Availability updated successfully!");
      } else {
        await axios.post("/api/availability", {
          date: format(selectedDate, "yyyy-MM-dd"),
          ...formData,
          isAvailable: formData.isAvailable === "true",
          recurringPattern: formData.recurringPattern === "NONE" ? null : formData.recurringPattern,
        });
        toast.success(formData.isAvailable === "true" ? "Availability added successfully!" : "Date marked unavailable. This prevents new bookings but does not affect existing confirmed bookings.");
      }
      
      onOpenChange(false);
      setFormData({ startTime: "09:00", endTime: "17:00", maxBookings: "1", recurringPattern: "NONE", isAvailable: "true" });
      onSuccess();
    } catch (error: any) {
      console.error("Error saving availability:", error);
      toast.error(error.response?.data?.error || "Failed to save availability");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingSlot ? "Edit Availability" : "Add Availability"}
          </DialogTitle>
          <DialogDescription>
            {editingSlot 
              ? "Update your time slot settings"
              : `Set your available time slots for ${selectedDate && format(selectedDate, "MMM d, yyyy")}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Time Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime" className="text-xs text-muted-foreground mb-1.5 block">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="endTime" className="text-xs text-muted-foreground mb-1.5 block">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Max Bookings */}
          <div className="space-y-3">
            <Label htmlFor="maxBookings" className="text-sm font-medium">
              Maximum Bookings
            </Label>
            <Input
              id="maxBookings"
              type="number"
              min="1"
              value={formData.maxBookings}
              onChange={(e) => setFormData({ ...formData, maxBookings: e.target.value })}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              How many bookings can this time slot accommodate?
            </p>
          </div>

          {/* Day Status */}
          <div className="space-y-3">
            <Label htmlFor="availabilityType" className="text-sm font-medium">
              Day Status
            </Label>
            <Select
              value={formData.isAvailable}
              onValueChange={(value) => setFormData({ ...formData, isAvailable: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Available for bookings</SelectItem>
                <SelectItem value="false">Unavailable / blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurring Pattern */}
          <div className="space-y-3">
            <Label htmlFor="recurringPattern" className="text-sm font-medium">
              Recurring Pattern
            </Label>
            <Select
              value={formData.recurringPattern}
              onValueChange={(value) => setFormData({ ...formData, recurringPattern: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="No recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No recurrence</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Automatically repeat this availability pattern
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? "Saving..." : editingSlot ? "Update" : "Add Availability"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
