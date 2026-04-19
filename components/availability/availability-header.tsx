"use client";

import { Button } from "@/components/ui/button";
import { Plus, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AvailabilityHeaderProps {
  onAddAvailability: () => void;
  onBulkBlock: () => void;
  onCopyPreviousWeek: () => void;
  onClearAvailability: () => void;
}

export function AvailabilityHeader({
  onAddAvailability,
  onBulkBlock,
  onCopyPreviousWeek,
  onClearAvailability,
}: AvailabilityHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Title and Subtitle */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Availability Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your schedule and available time slots
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onAddAvailability}
              size="lg"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Availability
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={onBulkBlock}>
                  Bulk Block Dates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCopyPreviousWeek}>
                  Copy Previous Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onClearAvailability}>
                  Clear All Availability
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
