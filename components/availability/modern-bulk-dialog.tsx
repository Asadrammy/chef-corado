"use client";

import { useState } from "react";
import { format, parseISO, isValid, eachDayOfInterval } from "date-fns";
import { CalendarX } from "lucide-react";
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
import { toast } from "sonner";
import axios from "axios";

interface ModernBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ModernBulkDialog({
  open,
  onOpenChange,
  onSuccess,
}: ModernBulkDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    reason: "",
  });

  const handleSubmit = async () => {
    const start = parseISO(formData.startDate);
    const end = parseISO(formData.endDate);

    if (!isValid(start) || !isValid(end)) {
      toast.error("Please select valid dates");
      return;
    }

    if (start > end) {
      toast.error("Start date must be before end date");
      return;
    }

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      toast.error("Maximum 30 days can be blocked at once");
      return;
    }

    setSubmitting(true);
    try {
      const dates = eachDayOfInterval({ start, end });
      const createPromises = dates.map(date =>
        axios.post("/api/availability", {
          date: format(date, "yyyy-MM-dd"),
          startTime: "00:00",
          endTime: "23:59",
          isAvailable: false,
          maxBookings: 0,
          reason: formData.reason || undefined,
        })
      );

      await Promise.all(createPromises);
      toast.success(`Blocked ${dates.length} date(s) successfully!`);
      onOpenChange(false);
      setFormData({
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        reason: "",
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error bulk blocking dates:", error);
      toast.error(error.response?.data?.error || "Failed to block dates");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Block Date Range</DialogTitle>
          <DialogDescription>
            Block multiple dates at once for vacations, time off, or other reasons
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-xs text-muted-foreground mb-1.5 block">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-xs text-muted-foreground mb-1.5 block">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-3">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason (Optional)
            </Label>
            <Input
              id="reason"
              type="text"
              placeholder="e.g., Vacation, Conference, Personal time"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="h-10"
            />
          </div>

          {/* Info Banner */}
          <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
            <CalendarX className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Important</p>
              This will block all dates in the selected range. Maximum 30 days can be blocked at once.
            </div>
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
            variant="destructive"
            className="flex-1"
          >
            {submitting ? "Blocking..." : "Block Dates"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
