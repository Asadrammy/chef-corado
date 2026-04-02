"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";

// Dynamically import chart to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ChartData {
  spendingTrends?: Array<{ date: string; amount: number }>;
  earningsTrends?: Array<{ date: string; amount: number }>;
  platformStats?: Record<string, number>;
}

export function AnalyticsChart() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const userId = session?.user?.id;

  const { data: chartData, isLoading } = useQuery<ChartData>({
    queryKey: ["analytics-chart", userId, userRole],
    queryFn: async () => {
      if (!userId || !userRole) return {};
      
      const response = await fetch(
        `/api/analytics?userId=${userId}&role=${userRole}&timeRange=30`
      );
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: !!userId && !!userRole,
  });

  const getChartOptions = () => {
    const isDark = document.documentElement.classList.contains("dark");
    
    return {
      chart: {
        type: "area" as const,
        toolbar: { show: false },
        background: "transparent",
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth" as const,
        width: 2,
      },
      fill: {
        type: "gradient" as const,
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
        },
      },
      xaxis: {
        type: "datetime" as const,
        labels: {
          style: {
            colors: isDark ? "#9ca3af" : "#6b7280",
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: isDark ? "#9ca3af" : "#6b7280",
          },
          formatter: (value: number) => `$${value.toLocaleString()}`,
        },
      },
      tooltip: {
        x: {
          format: "dd MMM yyyy",
        },
        y: {
          formatter: (value: number) => `$${value.toLocaleString()}`,
        },
        theme: isDark ? "dark" : "light" as const,
      },
      grid: {
        borderColor: isDark ? "#374151" : "#e5e7eb",
        strokeDashArray: 3,
      },
      theme: {
        mode: (isDark ? "dark" : "light") as "dark" | "light",
      },
    };
  };

  const getChartSeries = () => {
    const data = userRole === "CLIENT" 
      ? chartData?.spendingTrends 
      : chartData?.earningsTrends;

    if (!data || data.length === 0) {
      return [{
        name: userRole === "CLIENT" ? "Spending" : "Earnings",
        data: [],
      }];
    }

    return [{
      name: userRole === "CLIENT" ? "Spending" : "Earnings",
      data: data.map(item => ({
        x: new Date(item.date).getTime(),
        y: item.amount,
      })),
    }];
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded dark:bg-gray-700 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded dark:bg-gray-700"></div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {userRole === "CLIENT" ? "Spending Trends" : userRole === "CHEF" ? "Earnings Trends" : "Platform Analytics"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Last 30 days performance
        </p>
      </div>
      
      <div className="h-64">
        {typeof window !== "undefined" && (
          <Chart
            options={getChartOptions()}
            series={getChartSeries()}
            type="area"
            height={256}
          />
        )}
      </div>
    </div>
  );
}
