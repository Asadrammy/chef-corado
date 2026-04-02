"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero Section Skeleton */}
      <div className="relative overflow-hidden">
        <div className="h-80 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-3xl animate-pulse" />
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Opportunities Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse">
                    <div className="flex justify-between mb-4">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      <div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Quick Actions Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        <div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                        </div>
                      </div>
                      <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Profile Completion Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8" />
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                    </div>
                  ))}
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Section Skeleton */}
      <section className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2 animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
