"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  UserGroupIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";

interface AnalyticsData {
  totalBookings?: number;
  totalSpending?: number;
  totalEarnings?: number;
  completedBookings?: number;
  totalUsers?: number;
  totalChefs?: number;
  totalClients?: number;
  totalRevenue?: number;
  proposalsSent?: number;
  averageRating?: number;
  bookingsByStatus?: Record<string, number>;
  trends?: {
    bookingsChange?: number;
    spendingChange?: number;
    earningsChange?: number;
    usersChange?: number;
    revenueChange?: number;
  };
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: React.ReactNode;
  color: "blue" | "green" | "orange" | "purple";
}

const getMetricColor = (color: string) => {
  switch (color) {
    case "blue":
      return "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400";
    case "green":
      return "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400";
    case "orange":
      return "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400";
    case "purple":
      return "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getBadgeColor = (type: "increase" | "decrease") => {
  return type === "increase" 
    ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
    : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
};

export function MarketplaceMetrics() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const userId = session?.user?.id;

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["analytics", userId, userRole],
    queryFn: async () => {
      if (!userId || !userRole) throw new Error("User not authenticated");
      
      const response = await fetch(
        `/api/analytics?userId=${userId}&role=${userRole}&timeRange=30`
      );
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: !!userId && !!userRole,
    retry: 2,
  });

  const getMetricsForRole = (): MetricCard[] => {
    if (!analytics) return [];

    switch (userRole) {
      case "CLIENT":
        return [
          {
            title: "Total Bookings",
            value: analytics.totalBookings || 0,
            change: analytics.trends?.bookingsChange,
            changeType: (analytics.trends?.bookingsChange || 0) >= 0 ? "increase" : "decrease",
            icon: <CalendarIcon className="w-6 h-6" />,
            color: "blue",
          },
          {
            title: "Total Spending",
            value: `$${(analytics.totalSpending || 0).toLocaleString()}`,
            change: analytics.trends?.spendingChange,
            changeType: (analytics.trends?.spendingChange || 0) >= 0 ? "increase" : "decrease",
            icon: <CurrencyDollarIcon className="w-6 h-6" />,
            color: "green",
          },
          {
            title: "Active Requests",
            value: analytics.bookingsByStatus?.PENDING || 0,
            change: analytics.trends?.bookingsChange,
            changeType: (analytics.trends?.bookingsChange || 0) >= 0 ? "increase" : "decrease",
            icon: <DocumentTextIcon className="w-6 h-6" />,
            color: "orange",
          },
        ];

      case "CHEF":
        return [
          {
            title: "Total Earnings",
            value: `$${(analytics.totalEarnings || 0).toLocaleString()}`,
            change: analytics.trends?.earningsChange,
            changeType: (analytics.trends?.earningsChange || 0) >= 0 ? "increase" : "decrease",
            icon: <CurrencyDollarIcon className="w-6 h-6" />,
            color: "green",
          },
          {
            title: "Completed Bookings",
            value: analytics.completedBookings || 0,
            change: analytics.trends?.bookingsChange,
            changeType: (analytics.trends?.bookingsChange || 0) >= 0 ? "increase" : "decrease",
            icon: <CalendarIcon className="w-6 h-6" />,
            color: "blue",
          },
          {
            title: "Average Rating",
            value: analytics.averageRating?.toFixed(1) || "0.0",
            change: 0, // Rating doesn't have a meaningful trend
            changeType: "increase",
            icon: <UserGroupIcon className="w-6 h-6" />,
            color: "purple",
          },
        ];

      case "ADMIN":
        return [
          {
            title: "Total Users",
            value: analytics.totalUsers || 0,
            change: analytics.trends?.usersChange,
            changeType: (analytics.trends?.usersChange || 0) >= 0 ? "increase" : "decrease",
            icon: <UserGroupIcon className="w-6 h-6" />,
            color: "blue",
          },
          {
            title: "Platform Revenue",
            value: `$${(analytics.totalRevenue || 0).toLocaleString()}`,
            change: analytics.trends?.revenueChange,
            changeType: (analytics.trends?.revenueChange || 0) >= 0 ? "increase" : "decrease",
            icon: <CurrencyDollarIcon className="w-6 h-6" />,
            color: "green",
          },
          {
            title: "Active Chefs",
            value: analytics.totalChefs || 0,
            change: analytics.trends?.usersChange,
            changeType: (analytics.trends?.usersChange || 0) >= 0 ? "increase" : "decrease",
            icon: <CalendarIcon className="w-6 h-6" />,
            color: "orange",
          },
        ];

      default:
        return [];
    }
  };

  const metrics = getMetricsForRole();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="h-12 w-12 bg-muted rounded-xl mb-4"></div>
              <div className="h-4 bg-muted rounded w-24 mb-2"></div>
              <div className="h-8 bg-muted rounded w-32"></div>
              <div className="h-6 bg-muted rounded w-16 mt-2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive bg-destructive/10 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-destructive">Failed to load analytics</h3>
            <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-destructive hover:text-destructive/80 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state for analytics
  if (!analytics || Object.keys(analytics).length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center justify-center space-y-3 py-8">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-foreground">No analytics data available</h3>
            <p className="text-sm text-muted-foreground mt-1">Start using the platform to see your metrics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="card-hover group bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-sm p-6"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl icon-bg mb-4">
            {metric.icon}
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors group-hover:text-gray-900 dark:group-hover:text-white">
                {metric.title}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <h4 className="text-2xl font-semibold text-gray-900 dark:text-white transition-colors">
                {metric.value}
              </h4>
              {metric.change !== undefined && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${getBadgeColor(metric.changeType!)}`}>
                  {metric.changeType === "increase" ? (
                    <ArrowUpIcon className="w-3 h-3" />
                  ) : (
                    <ArrowDownIcon className="w-3 h-3" />
                  )}
                  <span className="font-semibold">{Math.abs(metric.change)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
