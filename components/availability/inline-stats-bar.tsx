"use client";

interface InlineStatsBarProps {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  upcomingBookings: number;
}

export function InlineStatsBar({
  totalSlots,
  availableSlots,
  bookedSlots,
  upcomingBookings,
}: InlineStatsBarProps) {
  return (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total Slots:</span>
            <span className="font-semibold text-foreground">{totalSlots}</span>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Available:</span>
            <span className="font-semibold text-emerald-600">{availableSlots}</span>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Booked:</span>
            <span className="font-semibold text-blue-600">{bookedSlots}</span>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Upcoming:</span>
            <span className="font-semibold text-purple-600">{upcomingBookings}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
