import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"
import { getServiceTypeLabel } from "@/lib/request-options"

export default async function AdminMultiDayBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; currency?: string; serviceType?: string }>
}) {
  const actor = await requireAdminPagePermission("multiDayBookings.manage")
  const params = await searchParams
  const requests = await prisma.request.findMany({
    where: {
      requestMode: "MULTI_DAY",
      countryCode: params.country && params.country !== "all" ? params.country : undefined,
      currency: params.currency && params.currency !== "all" ? params.currency : undefined,
      serviceType: params.serviceType && params.serviceType !== "all" ? params.serviceType : undefined,
      OR: params.q
        ? [
            { title: { contains: params.q, mode: "insensitive" } },
            { location: { contains: params.q, mode: "insensitive" } },
            { details: { contains: params.q, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      client: { select: { name: true, email: true } },
      proposals: { include: { chef: { include: { user: { select: { name: true, email: true } } } } } },
      multiDayDates: { orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const allDates = requests.flatMap((request) => request.multiDayDates)
  const dateKeys = allDates.map((date) => date.date.toISOString().slice(0, 10))
  const duplicateDates = new Set(dateKeys.filter((date, index) => dateKeys.indexOf(date) !== index))

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title="Multi-Day Bookings"
        description="Multi-day request queue with every service date, proposal/assignment state, currency, totals, and lightweight conflict signals."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Multi-day requests", value: requests.length },
          { label: "Service dates", value: allDates.length },
          { label: "With proposals", value: requests.filter((request) => request.proposals.length > 0).length },
          { label: "Date overlaps", value: duplicateDates.size, helper: "Same-date demand signal; chef-specific conflict needs assignment data." },
        ]}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search multi-day jobs" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="country" defaultValue={params.country ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All countries</option>{[...new Set(requests.map((request) => request.countryCode))].map((value) => <option key={value}>{value}</option>)}</select>
          <select name="currency" defaultValue={params.currency ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All currencies</option>{[...new Set(requests.map((request) => request.currency))].map((value) => <option key={value}>{value}</option>)}</select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={requests}
        emptyTitle="No multi-day requests found."
        columns={[
          { key: "client", label: "Client", render: (request) => <div><p className="font-medium">{request.client.name}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(request.client.email, actor)}</p></div> },
          { key: "range", label: "Date range", render: (request) => request.multiDayDates.length ? `${request.multiDayDates[0].date.toLocaleDateString()} - ${request.multiDayDates[request.multiDayDates.length - 1].date.toLocaleDateString()}` : request.eventDate.toLocaleDateString() },
          { key: "dates", label: "Service dates", render: (request) => <div>{request.multiDayDates.map((date) => <p key={date.id} className="text-xs">{date.date.toLocaleDateString()} {date.startTime ?? ""}{date.endTime ? `-${date.endTime}` : ""} - {getServiceTypeLabel(date.serviceType, date.serviceTypeLabel)}</p>)}</div> },
          { key: "service", label: "Service", render: (request) => request.serviceTypeLabel ?? request.serviceType ?? request.eventType },
          { key: "total", label: "Budget", render: (request) => <div><p>{formatCurrency(request.budget, request.currency)}</p><p className="text-xs text-muted-foreground">{request.budgetMode === "PER_DAY" ? "Per day mode" : request.budgetMode === "TOTAL_EVENT" ? "Total-event mode" : "Legacy budget"}</p></div> },
          { key: "assignment", label: "Assignment", render: (request) => request.proposals[0]?.chef?.user?.name ?? "Unassigned" },
          { key: "status", label: "State", render: (request) => <AdminStatusBadge status={request.proposals.length ? "REVIEW" : "OPEN"} /> },
          { key: "conflict", label: "Conflict", render: (request) => request.multiDayDates.some((date) => duplicateDates.has(date.date.toISOString().slice(0, 10))) ? <AdminStatusBadge status="REVIEW" /> : "None detected" },
          { key: "created", label: "Created", render: (request) => formatAdminDate(request.createdAt) },
          {
            key: "detail",
            label: "Review",
            render: (request) => (
              <AdminReviewDrawer title={request.title ?? "Multi-Day Chef Hire"} description="Review every service date, assignment state, budget, and overlap signal.">
                <AdminDrawerSection title="Engagement Summary">
                  <AdminInfoGrid
                    items={[
                      { label: "Client", value: `${request.client.name} / ${maskEmailForAdmin(request.client.email, actor)}` },
                      { label: "Service", value: request.serviceTypeLabel ?? request.serviceType ?? request.eventType },
                      { label: "Location", value: `${request.location} (${request.countryCode})` },
                      { label: "Budget", value: `${formatCurrency(request.budget, request.currency)} / ${request.budgetMode === "PER_DAY" ? "per-day mode" : request.budgetMode === "TOTAL_EVENT" ? "total-event mode" : "legacy"}` },
                      { label: "Assignment", value: request.proposals[0]?.chef?.user?.name ?? "Unassigned" },
                      { label: "Conflict", value: request.multiDayDates.some((date) => duplicateDates.has(date.date.toISOString().slice(0, 10))) ? <AdminStatusBadge status="REVIEW" /> : "None detected" },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Service Dates">
                  <div className="space-y-2">
                    {request.multiDayDates.map((date) => (
                      <p key={date.id} className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                        <span className="font-medium">{date.date.toLocaleDateString()} {date.startTime ?? ""}{date.endTime ? `-${date.endTime}` : ""}</span>
                        <span className="block text-xs text-muted-foreground">{getServiceTypeLabel(date.serviceType, date.serviceTypeLabel)}</span>
                        <span className="block text-xs text-muted-foreground">Cuisine: {parseJsonList(date.cuisineTypes).join(", ") || "Not specified"}</span>
                        <span className="block text-xs text-muted-foreground">Dietary: {parseJsonList(date.dietaryRequirements).join(", ") || "None selected"}</span>
                        <span className="block text-xs text-muted-foreground">Guests: {date.actualAttendeeCount ?? request.guestCount}{date.billableGuestCount ? ` / ${date.billableGuestCount} billable` : ""}</span>
                        {date.budget ? <span className="block text-xs text-muted-foreground">Daily budget: {formatCurrency(date.budget, request.currency)}</span> : null}
                        {date.notes ? <span className="block text-xs text-muted-foreground">{date.notes}</span> : date.serviceNeeds ? <span className="block text-xs text-muted-foreground">{date.serviceNeeds}</span> : null}
                      </p>
                    ))}
                  </div>
                </AdminDrawerSection>
              </AdminReviewDrawer>
            ),
          },
        ]}
      />
    </div>
  )
}

function parseJsonList(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean)
  }
  return []
}
