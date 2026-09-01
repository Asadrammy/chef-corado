import type { Prisma } from "@prisma/client"

import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar, AdminWarning } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { isPrismaConnectionError, prisma, withPrismaReconnect } from "@/lib/prisma"

type AdminRequest = Prisma.RequestGetPayload<{
  select: {
    id: true
    title: true
    eventType: true
    requestMode: true
    serviceType: true
    serviceTypeLabel: true
    location: true
    countryCode: true
    budget: true
    currency: true
    guestCount: true
    eventDate: true
    createdAt: true
    client: { select: { name: true; email: true } }
    proposals: { select: { id: true; status: true; price: true } }
    multiDayDates: { select: { id: true; date: true; startTime: true; endTime: true } }
  }
}>

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; eventType?: string; serviceType?: string; mode?: string; country?: string; currency?: string }>
}) {
  const actor = await requireAdminPagePermission("requests.view")
  const params = await searchParams
  let requests: AdminRequest[] = []
  let dataWarning: string | null = null

  try {
    requests = await withPrismaReconnect(
      () =>
        prisma.request.findMany({
          where: {
            requestMode: params.mode && params.mode !== "all" ? params.mode : undefined,
            eventType: params.eventType && params.eventType !== "all" ? params.eventType : undefined,
            serviceType: params.serviceType && params.serviceType !== "all" ? params.serviceType : undefined,
            countryCode: params.country && params.country !== "all" ? params.country : undefined,
            currency: params.currency && params.currency !== "all" ? params.currency : undefined,
            OR: params.q
              ? [
                  { title: { contains: params.q, mode: "insensitive" } },
                  { location: { contains: params.q, mode: "insensitive" } },
                  { description: { contains: params.q, mode: "insensitive" } },
                ]
              : undefined,
          },
          select: {
            id: true,
            title: true,
            eventType: true,
            requestMode: true,
            serviceType: true,
            serviceTypeLabel: true,
            location: true,
            countryCode: true,
            budget: true,
            currency: true,
            guestCount: true,
            eventDate: true,
            createdAt: true,
            client: { select: { name: true, email: true } },
            proposals: { select: { id: true, status: true, price: true } },
            multiDayDates: { select: { id: true, date: true, startTime: true, endTime: true }, orderBy: { date: "asc" } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      2
    )
  } catch (error) {
    if (!isPrismaConnectionError(error)) {
      throw error
    }

    dataWarning = "The database timed out while loading requests. Refresh to retry; no request data was changed."
  }

  const unique = (field: keyof typeof requests[number]) => [...new Set(requests.map((request) => String(request[field] ?? "")).filter(Boolean))].sort()
  const safeMultiDayDatesFor = (request: AdminRequest) => (request.multiDayDates ?? []).filter(Boolean)

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title="Requests"
        description="Admin-native request review across event type, service type, booking mode, country, currency, date, budget, and guest count. Commercial fields are shown read-only."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Requests", value: requests.length },
          { label: "Standard", value: requests.filter((request) => request.requestMode === "STANDARD").length },
          { label: "Multi-day", value: requests.filter((request) => request.requestMode === "MULTI_DAY").length },
          { label: "Proposal volume", value: requests.reduce((sum, request) => sum + request.proposals.length, 0) },
        ]}
      />
      {dataWarning ? (
        <AdminWarning>{dataWarning}</AdminWarning>
      ) : null}
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search requests" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="mode" defaultValue={params.mode ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All modes</option>{unique("requestMode").map((value) => <option key={value}>{value}</option>)}</select>
          <select name="serviceType" defaultValue={params.serviceType ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All services</option>{unique("serviceType").map((value) => <option key={value}>{value}</option>)}</select>
          <select name="eventType" defaultValue={params.eventType ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All events</option>{unique("eventType").map((value) => <option key={value}>{value}</option>)}</select>
          <select name="country" defaultValue={params.country ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All countries</option>{unique("countryCode").map((value) => <option key={value}>{value}</option>)}</select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={requests}
        emptyTitle="No requests found."
        columns={[
          { key: "request", label: "Request", render: (request) => <div><p className="font-medium">{request.title ?? request.serviceTypeLabel ?? request.eventType}</p><p className="text-xs text-muted-foreground">{request.id}</p></div> },
          { key: "client", label: "Client", render: (request) => <div><p>{request.client.name}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(request.client.email, actor)}</p></div> },
          { key: "mode", label: "Mode", render: (request) => <AdminStatusBadge status={request.requestMode} /> },
          { key: "service", label: "Service / event", render: (request) => <div><p>{request.serviceTypeLabel ?? request.serviceType ?? "Not set"}</p><p className="text-xs text-muted-foreground">{request.eventType}</p></div> },
          { key: "location", label: "Location", render: (request) => `${request.location} (${request.countryCode})` },
          { key: "budget", label: "Budget / guests", render: (request) => <div><p>{formatCurrency(request.budget, request.currency)}</p><p className="text-xs text-muted-foreground">{request.guestCount} guests</p></div> },
          { key: "dates", label: "Dates", render: (request) => request.requestMode === "MULTI_DAY" ? `${safeMultiDayDatesFor(request).length} service dates` : request.eventDate.toLocaleDateString() },
          { key: "proposals", label: "Proposals", render: (request) => request.proposals.length },
          { key: "created", label: "Created", render: (request) => formatAdminDate(request.createdAt) },
          {
            key: "detail",
            label: "Inspect",
            render: (request) => (
              <AdminReviewDrawer
                title={request.title ?? request.serviceTypeLabel ?? request.eventType}
                description="Inspect request context. Requests publish immediately, and moderation support stays separate from marketplace visibility."
                triggerLabel="Inspect"
              >
                <AdminDrawerSection title="Request Summary">
                  <AdminInfoGrid
                    items={[
                      { label: "Client", value: `${request.client.name} / ${maskEmailForAdmin(request.client.email, actor)}` },
                      { label: "Mode", value: <AdminStatusBadge status={request.requestMode} /> },
                      { label: "Service", value: request.serviceTypeLabel ?? request.serviceType ?? "Not set" },
                      { label: "Event", value: request.eventType },
                      { label: "Location", value: `${request.location} (${request.countryCode})` },
                      { label: "Budget", value: formatCurrency(request.budget, request.currency) },
                      { label: "Guests", value: request.guestCount },
                      { label: "Proposals", value: request.proposals.length },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Dates">
                  {request.requestMode === "MULTI_DAY" ? (
                    <div className="space-y-2">
                      {safeMultiDayDatesFor(request).map((date) => (
                        <p key={date.id} className="rounded-lg border border-border bg-muted/20 p-3 text-sm">{date.date.toLocaleDateString()} {date.startTime ?? ""}-{date.endTime ?? ""}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{request.eventDate.toLocaleDateString()}</p>
                  )}
                </AdminDrawerSection>
              </AdminReviewDrawer>
            ),
          },
        ]}
      />
    </div>
  )
}
