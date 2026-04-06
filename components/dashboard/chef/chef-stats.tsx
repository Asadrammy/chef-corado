import { CalendarDays, DollarSign, Star, Users } from "lucide-react"

import { DashboardStatCard } from "@/components/ui/dashboard-stat-card"

interface ChefStatsProps {
  activeBookings: number
  availableRequests: number
  totalEarnings: number
  completedBookings: number
  averageRating: number
}

export function ChefStats({
  activeBookings,
  availableRequests,
  totalEarnings,
  completedBookings,
  averageRating,
}: ChefStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        label="Active bookings"
        value={activeBookings}
        description="Current confirmed and in-progress work"
        icon={<CalendarDays className="h-5 w-5" />}
        trend={activeBookings > 0 ? "You have live work requiring attention." : "No active jobs right now."}
      />
      <DashboardStatCard
        label="Open requests"
        value={availableRequests}
        description="Nearby client opportunities ready to review"
        icon={<Users className="h-5 w-5" />}
        trend={availableRequests > 0 ? "New demand is available to convert." : "No nearby demand at the moment."}
      />
      <DashboardStatCard
        label="Total earnings"
        value={`$${totalEarnings.toLocaleString()}`}
        description="Completed payout value credited to you"
        icon={<DollarSign className="h-5 w-5" />}
        trend={totalEarnings > 0 ? "Revenue reflects completed payouts." : "Complete bookings to unlock revenue."}
      />
      <DashboardStatCard
        label="Completed bookings"
        value={completedBookings}
        description={averageRating > 0 ? `Average rating ${averageRating.toFixed(1)}` : "No ratings yet"}
        icon={<Star className="h-5 w-5" />}
        trend={averageRating > 0 ? `Customer satisfaction is holding at ${averageRating.toFixed(1)}.` : "Your first completed jobs will unlock rating insight."}
      />
    </div>
  )
}
