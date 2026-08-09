import Link from "next/link"

import { AdminDataTable, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar } from "@/components/admin/admin-workspace"
import { Button } from "@/components/ui/button"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; chefId?: string; status?: string; serviceType?: string }>
}) {
  await requireAdminPagePermission("bookings.view")
  const params = await searchParams
  const anchor = params.date ? startOfDay(new Date(params.date)) : startOfDay(new Date())
  const view = params.view === "day" || params.view === "week" ? params.view : "month"
  const rangeStart = view === "day" ? anchor : view === "week" ? addDays(anchor, -anchor.getDay()) : new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const rangeEnd = view === "day" ? addDays(rangeStart, 1) : view === "week" ? addDays(rangeStart, 7) : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
  const days = Array.from({ length: Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) }, (_, index) => addDays(rangeStart, index))

  const [bookings, multiDayDates, availability, chefs] = await Promise.all([
    prisma.booking.findMany({
      where: {
        eventDate: { gte: rangeStart, lt: rangeEnd },
        chefId: params.chefId && params.chefId !== "all" ? params.chefId : undefined,
        status: params.status && params.status !== "all" ? params.status : undefined,
        serviceType: params.serviceType && params.serviceType !== "all" ? params.serviceType : undefined,
      },
      include: { client: { select: { name: true } }, chef: { include: { user: { select: { name: true } } } }, payments: true },
      orderBy: { eventDate: "asc" },
    }),
    prisma.multiDayRequestDate.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd }, request: { requestMode: "MULTI_DAY" } },
      include: { request: { include: { client: { select: { name: true } } } } },
      orderBy: { date: "asc" },
    }),
    prisma.availability.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd }, chefId: params.chefId && params.chefId !== "all" ? params.chefId : undefined },
      include: { chef: { include: { user: { select: { name: true } } } } },
      orderBy: { date: "asc" },
    }),
    prisma.chefProfile.findMany({ where: { isApproved: true, isBanned: false }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } }, take: 200 }),
  ])

  const bookingKeyCounts = new Map<string, number>()
  bookings.forEach((booking) => {
    const key = `${booking.chefId}-${booking.eventDate.toISOString().slice(0, 10)}`
    bookingKeyCounts.set(key, (bookingKeyCounts.get(key) ?? 0) + 1)
  })

  const unavailableKeys = new Set(availability.filter((slot) => !slot.isAvailable).map((slot) => `${slot.chefId}-${slot.date.toISOString().slice(0, 10)}`))
  const conflicts = bookings.filter((booking) => {
    const key = `${booking.chefId}-${booking.eventDate.toISOString().slice(0, 10)}`
    return (bookingKeyCounts.get(key) ?? 0) > 1 || unavailableKeys.has(key)
  })

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title="Calendar"
        description="Month, week, and day operational calendar for bookings, multi-day service dates, chef availability, and conflict signals."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Confirmed bookings", value: bookings.filter((booking) => booking.status === "CONFIRMED").length },
          { label: "Multi-day dates", value: multiDayDates.length },
          { label: "Unavailable slots", value: availability.filter((slot) => !slot.isAvailable).length },
          { label: "Conflicts", value: conflicts.length },
        ]}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <select name="view" defaultValue={view} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="month">Month</option><option value="week">Week</option><option value="day">Day</option></select>
          <input name="date" type="date" defaultValue={anchor.toISOString().slice(0, 10)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="chefId" defaultValue={params.chefId ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All chefs</option>{chefs.map((chef) => <option key={chef.id} value={chef.id}>{chef.user.name}</option>)}</select>
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All booking states</option>{["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((status) => <option key={status}>{status}</option>)}</select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10)
          const dayBookings = bookings.filter((booking) => booking.eventDate.toISOString().slice(0, 10) === key)
          const dayMulti = multiDayDates.filter((date) => date.date.toISOString().slice(0, 10) === key)
          const dayUnavailable = availability.filter((slot) => slot.date.toISOString().slice(0, 10) === key && !slot.isAvailable)
          return (
            <section key={key} className="min-h-44 rounded-xl border border-border bg-card p-3 shadow-sm shadow-black/[0.03] transition-colors hover:border-primary/30 hover:bg-muted/15">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: "short" })}</p>
                </div>
                {dayBookings.length + dayMulti.length ? <AdminStatusBadge status={dayUnavailable.length ? "REVIEW" : "CONFIRMED"} /> : null}
              </div>
              <div className="mt-3 space-y-2">
                {dayBookings.slice(0, 4).map((booking) => (
                  <Link key={booking.id} href={`/dashboard/admin/bookings/${booking.id}`} className="block rounded-lg border border-border bg-background p-2 text-xs shadow-sm transition-colors hover:border-primary/40">
                    <span className="font-semibold text-foreground">{booking.chef.user.name}</span>
                    <span className="block leading-5 text-muted-foreground">{booking.serviceTypeLabel ?? booking.bookingType}</span>
                    <span className="mt-1 inline-flex text-[11px] font-medium text-primary">{booking.status}</span>
                  </Link>
                ))}
                {dayMulti.slice(0, 3).map((date) => (
                  <div key={date.id} className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2 text-xs">
                    <span className="font-semibold text-foreground">Multi-day</span>
                    <span className="block leading-5 text-muted-foreground">{date.request.client.name} / {date.startTime ?? "time TBD"}</span>
                  </div>
                ))}
                {dayUnavailable.length ? <p className="rounded-md bg-[hsl(var(--warning)/0.10)] px-2 py-1 text-xs font-medium text-[hsl(var(--brand-chocolate))]">{dayUnavailable.length} unavailable chef slots</p> : null}
              </div>
            </section>
          )
        })}
      </div>
      <AdminDataTable
        rows={bookings}
        emptyTitle="No bookings in this date range."
        columns={[
          { key: "date", label: "Date", render: (booking) => booking.eventDate.toLocaleDateString() },
          { key: "chef", label: "Chef", render: (booking) => booking.chef.user.name },
          { key: "client", label: "Client", render: (booking) => booking.client.name },
          { key: "service", label: "Service", render: (booking) => booking.serviceTypeLabel ?? booking.bookingType },
          { key: "status", label: "Status", render: (booking) => <AdminStatusBadge status={booking.status} /> },
          { key: "value", label: "Value", render: (booking) => formatCurrency(booking.totalPrice, booking.currency) },
          { key: "conflict", label: "Conflict", render: (booking) => conflicts.some((item) => item.id === booking.id) ? <AdminStatusBadge status="REVIEW" /> : "None detected" },
          { key: "detail", label: "Detail", render: (booking) => <Button asChild variant="outline" size="sm" className="h-8 rounded-md"><Link href={`/dashboard/admin/bookings/${booking.id}`}>Open</Link></Button> },
        ]}
      />
    </div>
  )
}
