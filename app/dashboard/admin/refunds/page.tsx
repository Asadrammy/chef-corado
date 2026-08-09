import { AdminActionForm } from "@/components/admin/admin-action-form"
import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar, AdminWarning } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const actor = await requireAdminPagePermission("refunds.request")
  const params = await searchParams
  const refunds = await prisma.refund.findMany({
    where: {
      status: params.status && params.status !== "all" ? params.status : undefined,
      OR: params.q
        ? [
            { reason: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      payment: {
        include: {
          booking: {
            include: {
              client: { select: { name: true, email: true } },
              chef: { include: { user: { select: { name: true, email: true } } } },
            },
          },
          ledgerEntries: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      },
      ledgerEntries: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    take: 100,
  })

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Finance"
        title="Refunds & Credits"
        description="Review refund requests through the authoritative refund service. Approval requires refunds.approve and Stripe configuration; mixed currencies are never summed together."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Pending", value: refunds.filter((refund) => refund.status === "PENDING").length },
          { label: "Processed", value: refunds.filter((refund) => ["PROCESSED", "APPROVED"].includes(refund.status)).length },
          { label: "Rejected", value: refunds.filter((refund) => refund.status === "REJECTED").length },
          { label: "Credit ledger", value: "Separate", helper: "Credits are not faked when no persisted credit model exists." },
        ]}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search refunds" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All statuses</option>
            {["PENDING", "PROCESSED", "REJECTED", "FAILED"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={refunds}
        emptyTitle="No refunds found."
        columns={[
          { key: "request", label: "Request", render: (refund) => <div><p className="font-medium">{refund.reason}</p><p className="text-xs text-muted-foreground">{refund.description}</p></div> },
          { key: "amount", label: "Amount", render: (refund) => formatCurrency(refund.amount, refund.payment.currency) },
          { key: "payment", label: "Payment snapshot", render: (refund) => <div><p>{refund.payment.status}</p><p className="text-xs text-muted-foreground">{formatCurrency(refund.payment.totalAmount, refund.payment.currency)} paid</p></div> },
          { key: "booking", label: "Booking", render: (refund) => <div><p>{refund.payment.booking.id}</p><p className="text-xs text-muted-foreground">{refund.payment.booking.serviceTypeLabel ?? refund.payment.booking.bookingType}</p></div> },
          { key: "people", label: "Client / chef", render: (refund) => <div><p>{refund.payment.booking.client.name}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(refund.payment.booking.client.email, actor)}</p><p className="text-xs text-muted-foreground">Chef: {refund.payment.booking.chef.user.name}</p></div> },
          { key: "status", label: "Status", render: (refund) => <AdminStatusBadge status={refund.status} /> },
          { key: "created", label: "Age", render: (refund) => formatAdminDate(refund.createdAt) },
          {
            key: "actions",
            label: "Review",
            render: (refund) => refund.status === "PENDING" ? (
              <AdminReviewDrawer title={`Refund ${refund.id}`} description="Review payment context and ledger impact before approving or rejecting a financial action.">
                <AdminWarning>Approving a refund is a financial action. Confirm the amount, payment status, and booking context before submitting.</AdminWarning>
                <AdminDrawerSection title="Transaction Summary">
                  <AdminInfoGrid
                    items={[
                      { label: "Requested amount", value: formatCurrency(refund.amount, refund.payment.currency) },
                      { label: "Payment total", value: formatCurrency(refund.payment.totalAmount, refund.payment.currency) },
                      { label: "Payment status", value: <AdminStatusBadge status={refund.payment.status} /> },
                      { label: "Booking", value: refund.payment.booking.id },
                      { label: "Client", value: `${refund.payment.booking.client.name} / ${maskEmailForAdmin(refund.payment.booking.client.email, actor)}` },
                      { label: "Chef", value: refund.payment.booking.chef.user.name },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Approve Refund">
                  <AdminActionForm endpoint={`/api/refunds/${refund.id}`} compact submitLabel="Approve refund" fields={[{ name: "status", type: "hidden", defaultValue: "APPROVED" }, { name: "adminNote", label: "Note", placeholder: "Approval note" }]} />
                </AdminDrawerSection>
                <AdminDrawerSection title="Reject Refund">
                  <AdminActionForm endpoint={`/api/refunds/${refund.id}`} compact submitLabel="Reject refund" fields={[{ name: "status", type: "hidden", defaultValue: "REJECTED" }, { name: "adminNote", label: "Reason", placeholder: "Rejection reason" }]} />
                </AdminDrawerSection>
              </AdminReviewDrawer>
            ) : "No pending action",
          },
        ]}
      />
    </div>
  )
}
