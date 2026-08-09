import { AdminDataTable, AdminMetricGrid, AdminPageHeader, AdminToolbar } from "@/components/admin/admin-workspace"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  await requireAdminPagePermission("analytics.view")
  const params = await searchParams
  const rangeDays = params.range === "7" ? 7 : params.range === "90" ? 90 : 30
  const since = daysAgo(rangeDays)

  const [requests, proposals, bookings, paymentsByCurrency, users, activeChefs, disputes, reviews, support, fullTime, serviceMix, countryMix] = await Promise.all([
    prisma.request.count({ where: { createdAt: { gte: since } } }),
    prisma.proposal.count({ where: { createdAt: { gte: since } } }),
    prisma.booking.findMany({ where: { createdAt: { gte: since } }, include: { payments: true } }),
    prisma.payment.groupBy({ by: ["currency"], where: { createdAt: { gte: since } }, _sum: { totalAmount: true, commissionAmount: true }, _count: { _all: true } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.chefProfile.count({ where: { isApproved: true, isBanned: false, updatedAt: { gte: since } } }),
    prisma.dispute.count({ where: { createdAt: { gte: since } } }),
    prisma.review.aggregate({ where: { createdAt: { gte: since } }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.supportTicket.findMany({ where: { createdAt: { gte: since } } }),
    prisma.fullTimeChefEnquiry.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.request.groupBy({ by: ["serviceType"], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { serviceType: "asc" } }),
    prisma.request.groupBy({ by: ["countryCode"], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { countryCode: "asc" } }),
  ])

  const completedBookings = bookings.filter((booking) => booking.status === "COMPLETED").length
  const cancelledBookings = bookings.filter((booking) => booking.status === "CANCELLED").length
  const resolvedSupport = support.filter((ticket) => ticket.resolvedAt)
  const avgResolutionHours = resolvedSupport.length
    ? Math.round(resolvedSupport.reduce((sum, ticket) => sum + ((ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / 3600000), 0) / resolvedSupport.length)
    : null

  const metricRows = [
    { id: "requests", metric: "Requests", value: requests, formula: "Request records created in selected range" },
    { id: "proposals", metric: "Proposals", value: proposals, formula: "Proposal records created in selected range" },
    { id: "bookings", metric: "Bookings", value: bookings.length, formula: "Booking records created in selected range" },
    { id: "new-users", metric: "New users", value: users, formula: "User records created in selected range" },
    { id: "active-chefs", metric: "Active chefs", value: activeChefs, formula: "Approved, unbanned chef profiles updated in selected range" },
    { id: "cancellation-rate", metric: "Cancellation rate", value: bookings.length ? `${Math.round((cancelledBookings / bookings.length) * 100)}%` : "N/A", formula: "Cancelled bookings / total bookings" },
    { id: "dispute-rate", metric: "Dispute rate", value: bookings.length ? `${Math.round((disputes / bookings.length) * 100)}%` : "N/A", formula: "Disputes / bookings" },
    { id: "rating", metric: "Average rating", value: reviews._avg.rating ? reviews._avg.rating.toFixed(1) : "N/A", formula: "Average review rating in selected range" },
    { id: "support-resolution", metric: "Avg support resolution", value: avgResolutionHours === null ? "N/A" : `${avgResolutionHours}h`, formula: "Mean resolvedAt - createdAt for resolved tickets" },
  ]
  const maxServiceCount = Math.max(1, ...serviceMix.map((row) => row._count._all))
  const maxCountryCount = Math.max(1, ...countryMix.map((row) => row._count._all))

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Insights" title="Analytics" description="Executive workspace using real operational data only. Mixed currencies remain separated because no reporting FX system exists." />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <select name="range" defaultValue={String(rangeDays)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminMetricGrid
        metrics={[
          { label: "Requests", value: requests },
          { label: "Bookings", value: bookings.length, helper: `${completedBookings} completed` },
          { label: "Support volume", value: support.length, helper: avgResolutionHours === null ? "Resolution time unavailable" : `${avgResolutionHours}h average resolution` },
          { label: "Full-time pipeline", value: fullTime.reduce((sum, row) => sum + row._count._all, 0) },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm shadow-black/[0.03]">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Service-Type Mix</h2>
            <p className="mt-1 text-xs text-muted-foreground">Request distribution in the selected range.</p>
          </div>
          <div className="space-y-3">
            {serviceMix.map((row) => (
              <div key={row.serviceType ?? "unknown"} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">{row.serviceType ?? "Unknown"}</span>
                  <span className="text-muted-foreground">{row._count._all}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(6, (row._count._all / maxServiceCount) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm shadow-black/[0.03]">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Country Mix</h2>
            <p className="mt-1 text-xs text-muted-foreground">Demand distribution by request country.</p>
          </div>
          <div className="space-y-3">
            {countryMix.map((row) => (
              <div key={row.countryCode} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">{row.countryCode}</span>
                  <span className="text-muted-foreground">{row._count._all}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(6, (row._count._all / maxCountryCount) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <AdminDataTable rows={metricRows} emptyTitle="No analytics available." columns={[
        { key: "metric", label: "Metric", render: (row) => row.metric },
        { key: "value", label: "Value", render: (row) => row.value },
        { key: "formula", label: "Formula", render: (row) => row.formula },
      ]} />
      <AdminDataTable rows={paymentsByCurrency.map((row) => ({ id: row.currency, ...row }))} emptyTitle="No revenue data." columns={[
        { key: "currency", label: "Currency", render: (row) => row.currency },
        { key: "gmv", label: "GMV", render: (row) => formatCurrency(row._sum.totalAmount ?? 0, row.currency) },
        { key: "revenue", label: "Platform fees", render: (row) => formatCurrency(row._sum.commissionAmount ?? 0, row.currency) },
        { key: "count", label: "Payments", render: (row) => row._count._all },
      ]} />
      <div className="grid gap-4 xl:grid-cols-3">
        <AdminDataTable rows={serviceMix.map((row) => ({ id: row.serviceType ?? "unknown", ...row }))} emptyTitle="No service mix." columns={[{ key: "service", label: "Service type", render: (row) => row.serviceType ?? "Unknown" }, { key: "count", label: "Requests", render: (row) => row._count._all }]} />
        <AdminDataTable rows={countryMix.map((row) => ({ id: row.countryCode, ...row }))} emptyTitle="No country mix." columns={[{ key: "country", label: "Country", render: (row) => row.countryCode }, { key: "count", label: "Requests", render: (row) => row._count._all }]} />
        <AdminDataTable rows={fullTime.map((row) => ({ id: row.status, ...row }))} emptyTitle="No full-time pipeline." columns={[{ key: "status", label: "Pipeline stage", render: (row) => row.status }, { key: "count", label: "Enquiries", render: (row) => row._count._all }]} />
      </div>
    </div>
  )
}
