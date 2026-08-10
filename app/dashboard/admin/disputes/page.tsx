import type { Prisma } from "@prisma/client"

import { AdminActionForm } from "@/components/admin/admin-action-form"
import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar, AdminWarning } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { isPrismaConnectionError, prisma, withPrismaReconnect } from "@/lib/prisma"

const disputeStatuses = ["OPEN", "UNDER_REVIEW", "WAITING_ON_CUSTOMER", "PROPOSED_RESOLUTION", "RESOLVED", "REJECTED", "ESCALATED", "CLOSED"].map((value) => ({ label: value.replace(/_/g, " "), value }))

type AdminDispute = Prisma.DisputeGetPayload<{
  include: {
    booking: {
      include: {
        client: { select: { name: true; email: true } }
        chef: { include: { user: { select: { name: true; email: true } } } }
        payments: true
      }
    }
  }
}>

type AdminAssignee = { id: string; name: string }

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; assignee?: string }>
}) {
  const actor = await requireAdminPagePermission("disputes.view")
  const params = await searchParams
  let disputes: AdminDispute[] = []
  let assignees: AdminAssignee[] = []
  let dataWarning: string | null = null

  try {
    ;[disputes, assignees] = await withPrismaReconnect(() =>
      Promise.all([
        prisma.dispute.findMany({
          where: {
            status: params.status && params.status !== "all" ? params.status : undefined,
            assignedTo: params.assignee && params.assignee !== "all" ? params.assignee : undefined,
            OR: params.q
              ? [
                  { reason: { contains: params.q, mode: "insensitive" } },
                  { description: { contains: params.q, mode: "insensitive" } },
                  { evidence: { contains: params.q, mode: "insensitive" } },
                ]
              : undefined,
          },
          include: {
            booking: {
              include: {
                client: { select: { name: true, email: true } },
                chef: { include: { user: { select: { name: true, email: true } } } },
                payments: true,
              },
            },
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: 100,
        }),
        prisma.user.findMany({ where: { role: "ADMIN", adminDisabledAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      ]),
      2
    )
  } catch (error) {
    if (!isPrismaConnectionError(error)) {
      throw error
    }

    dataWarning = "The database timed out while loading disputes. Refresh to retry; no dispute data was changed."
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Support & Trust"
        title="Disputes"
        description="Investigation queue for booking disputes. Financial resolution remains routed through refund/credit services rather than direct payment mutation."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Open", value: disputes.filter((dispute) => ["OPEN", "UNDER_REVIEW", "WAITING_ON_CUSTOMER"].includes(dispute.status)).length },
          { label: "Proposed", value: disputes.filter((dispute) => dispute.status === "PROPOSED_RESOLUTION").length },
          { label: "Resolved", value: disputes.filter((dispute) => ["RESOLVED", "REJECTED", "CLOSED"].includes(dispute.status)).length },
          { label: "Unassigned", value: disputes.filter((dispute) => !dispute.assignedTo).length },
        ]}
      />
      {dataWarning ? (
        <AdminWarning>{dataWarning}</AdminWarning>
      ) : null}
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search disputes" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All statuses</option>
            {disputeStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <select name="assignee" defaultValue={params.assignee ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All assignees</option>
            {assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={disputes}
        emptyTitle="No disputes found."
        columns={[
          { key: "reason", label: "Dispute", render: (dispute) => <div><p className="font-medium">{dispute.reason}</p><p className="max-w-md truncate text-xs text-muted-foreground">{dispute.description}</p></div> },
          { key: "people", label: "Client / chef", render: (dispute) => <div><p>{dispute.booking.client.name}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(dispute.booking.client.email, actor)}</p><p className="text-xs text-muted-foreground">Chef: {dispute.booking.chef.user.name}</p></div> },
          { key: "booking", label: "Booking", render: (dispute) => <div><p>{dispute.booking.id}</p><p className="text-xs text-muted-foreground">{formatCurrency(dispute.booking.totalPrice, dispute.booking.currency)}</p></div> },
          { key: "payment", label: "Payment", render: (dispute) => dispute.booking.payments ? <AdminStatusBadge status={dispute.booking.payments.status} /> : "No payment" },
          { key: "status", label: "Status", render: (dispute) => <AdminStatusBadge status={dispute.status} /> },
          { key: "created", label: "Created", render: (dispute) => formatAdminDate(dispute.createdAt) },
          {
            key: "actions",
            label: "Investigate",
            render: (dispute) => (
              <AdminReviewDrawer title={dispute.reason} description="Review booking context, evidence, financial state, and investigation status before resolving.">
                <AdminDrawerSection title="Case Summary">
                  <AdminInfoGrid
                    items={[
                      { label: "Status", value: <AdminStatusBadge status={dispute.status} /> },
                      { label: "Initiated by", value: dispute.initiatedBy },
                      { label: "Client", value: `${dispute.booking.client.name} / ${maskEmailForAdmin(dispute.booking.client.email, actor)}` },
                      { label: "Chef", value: dispute.booking.chef.user.name },
                      { label: "Booking value", value: formatCurrency(dispute.booking.totalPrice, dispute.booking.currency) },
                      { label: "Payment", value: dispute.booking.payments ? <AdminStatusBadge status={dispute.booking.payments.status} /> : "No payment" },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Evidence And Notes">
                  <p className="text-sm leading-6 text-muted-foreground">{dispute.description}</p>
                  {dispute.evidence ? <p className="mt-3 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">{dispute.evidence}</p> : null}
                </AdminDrawerSection>
                <AdminDrawerSection title="Investigation Update" description="Financial outcomes should be handled through refund or credit workflows, not direct payment mutation.">
                  <AdminActionForm
                    endpoint={`/api/admin/disputes/${dispute.id}`}
                    compact
                    submitLabel="Save investigation"
                    fields={[
                      { name: "assignedTo", label: "Assignee", type: "select", nullable: true, defaultValue: dispute.assignedTo, options: assignees.map((user) => ({ label: user.name, value: user.id })) },
                      { name: "status", label: "Status", type: "select", defaultValue: dispute.status, options: disputeStatuses },
                      { name: "investigationState", label: "State", defaultValue: dispute.investigationState, nullable: true },
                      { name: "resolution", label: "Resolution", defaultValue: dispute.resolution, nullable: true },
                      { name: "internalNotes", label: "Notes", defaultValue: dispute.internalNotes, nullable: true },
                    ]}
                  />
                </AdminDrawerSection>
              </AdminReviewDrawer>
            ),
          },
        ]}
      />
    </div>
  )
}
