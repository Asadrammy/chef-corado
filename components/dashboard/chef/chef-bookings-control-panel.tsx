"use client"

import { ArrowUpDown, Filter, Search, SlidersHorizontal, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChefBookingsControlPanelProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
}

export function ChefBookingsControlPanel({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
}: ChefBookingsControlPanelProps) {
  return (
    <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <div className="text-primary inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Search and filter
            </div>
            <CardTitle className="text-foreground text-xl font-semibold tracking-tight">
              Booking controls
            </CardTitle>
            <p className="text-muted-foreground text-sm leading-6">
              Search your confirmed work, surface the right status, and sort upcoming events from one premium control panel.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_auto] xl:items-center">
          <div className="group relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
            <Input
              placeholder="Search by client, location, or event notes..."
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className="h-11 rounded-xl border-border/60 bg-muted/30 pl-10 shadow-sm transition-all duration-200 focus-visible:border-border focus-visible:bg-background focus-visible:shadow-md focus-visible:shadow-black/5"
            />
          </div>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-white/70 bg-background/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Upcoming</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-white/70 bg-background/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="h-11 rounded-2xl border-white/70 bg-background/70 px-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-background dark:border-white/10 dark:bg-background/10 dark:hover:bg-background/15"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters active
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
