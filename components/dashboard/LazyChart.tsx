"use client";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Skeleton loader for the chart
const ChartSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
    <div className="mb-4">
      <div className="h-6 bg-gray-200 rounded w-48 dark:bg-gray-700"></div>
      <div className="h-4 bg-gray-200 rounded w-32 mt-2 dark:bg-gray-700"></div>
    </div>
    <div className="h-64 bg-gray-200 rounded dark:bg-gray-700"></div>
  </div>
);

// Dynamic import of the AnalyticsChart component
const AnalyticsChart = dynamic(() => import("./AnalyticsChart").then(mod => ({ default: mod.AnalyticsChart })), {
  loading: ChartSkeleton,
  ssr: false,
});

interface LazyChartProps {
  className?: string;
}

export default function LazyChart({ className }: LazyChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <AnalyticsChart />
    </Suspense>
  );
}
