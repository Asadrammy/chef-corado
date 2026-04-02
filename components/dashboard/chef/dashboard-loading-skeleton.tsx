"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardLoadingSkeleton() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-8 space-y-10">
        {/* Hero Section Skeleton */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-10">
            <div className="space-y-8">
              <Skeleton className="h-8 w-32 rounded-full" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-96" />
                <Skeleton className="h-6 w-80" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-14 w-48 rounded-xl" />
                <Skeleton className="h-14 w-48 rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3 space-y-10">
            {/* Opportunities Skeleton */}
            <Card className="border-0 rounded-3xl shadow-lg">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-6 w-96" />
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-6 space-y-4">
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                        <div className="flex gap-4">
                          <Skeleton className="h-6 w-20 rounded-full" />
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Skeleton */}
            <Card className="border-0 rounded-3xl shadow-lg">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-80" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border border-gray-200 rounded-2xl p-6 space-y-4">
                        <Skeleton className="w-12 h-12 rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <Card className="border border-gray-200 rounded-3xl p-6 shadow-sm">
              <div className="space-y-6">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
