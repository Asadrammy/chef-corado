import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"

export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; status?: string; q?: string }>
}) {
  await requireAdminPagePermission("commissions.view")
  const params = await searchParams
  const payments = await prisma.payment.findMany({
    where: {
      currency: params.currency && params.currency !== "all" ? params.currency : undefined,
      status: params.status && params.status !== "all" ? params.status : undefined,
      OR: params.q ? [{ bookingId: { contains: params.q, mode: "insensitive" } }] : undefined,
    },
    include: {
      booking: {
        include: {
          client: { select: { name: true } },
          chef: { include: { user: { select: { name: true } } } },
        },
      },
      refunds: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const currencies = [...new Set(payments.map((payment) => payment.currency))].sort()
  const totals = currencies.map((currency) => ({
    currency,
    gross: payments.filter((payment) => payment.currency === currency).reduce((sum, payment) => sum + payment.totalAmount, 0),
    commission: payments.filter((payment) => payment.currency === currency).reduce((sum, payment) => sum + payment.commissionAmount, 0),
    chefNet: payments.filter((payment) => payment.currency === currency).reduce((sum, payment) => sum + payment.chefAmount, 0),
  }))

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Finance" title="Commissions" description="Finance ledger view grouped by currency. GBP, USD, KES, and EUR are never summed into one misleading total." />
      <AdminMetricGrid
        metrics={totals.slice(0, 4).map((row) => ({ label: `${row.currency} platform fee`, value: formatCurrency(row.commission, row.currency), helper: `${formatCurrency(row.gross, row.currency)} gross` }))}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Booking ID" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="currency" defaultValue={params.currency ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All currencies</option>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select>
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All statuses</option>{[...new Set(payments.map((payment) => payment.status))].map((status) => <option key={status}>{status}</option>)}</select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={payments}
        emptyTitle="No commission-bearing payments found."
        columns={[
          { key: "booking", label: "Booking", render: (payment) => payment.bookingId },
          { key: "people", label: "Client / chef", render: (payment) => <div><p>{payment.booking.client.name}</p><p className="text-xs text-muted-foreground">{payment.booking.chef.user.name}</p></div> },
          { key: "service", label: "Service", render: (payment) => payment.booking.serviceTypeLabel ?? payment.booking.bookingType },
          { key: "gross", label: "Gross booking", render: (payment) => formatCurrency(payment.totalAmount, payment.currency) },
          { key: "fee", label: "Platform fee", render: (payment) => formatCurrency(payment.commissionAmount, payment.currency) },
          { key: "chef", label: "Chef net", render: (payment) => formatCurrency(payment.chefAmount, payment.currency) },
          { key: "refunds", label: "Refund adjustments", render: (payment) => payment.refunds.length ? payment.refunds.map((refund) => formatCurrency(refund.amount, payment.currency)).join(", ") : "None" },
          { key: "status", label: "Status", render: (payment) => <AdminStatusBadge status={payment.status} /> },
          {
            key: "detail",
            label: "Review",
            render: (payment) => (
              <AdminReviewDrawer title={`Commission ${payment.bookingId}`} description="Review gross, platform fee, chef net, and refund adjustments in the original currency.">
                <AdminDrawerSection title="Ledger Summary">
                  <AdminInfoGrid
                    items={[
                      { label: "Currency", value: payment.currency },
                      { label: "Gross booking", value: formatCurrency(payment.totalAmount, payment.currency) },
                      { label: "Platform fee", value: formatCurrency(payment.commissionAmount, payment.currency) },
                      { label: "Chef net", value: formatCurrency(payment.chefAmount, payment.currency) },
                      { label: "Refund adjustments", value: payment.refunds.length ? payment.refunds.map((refund) => formatCurrency(refund.amount, payment.currency)).join(", ") : "None" },
                      { label: "Status", value: <AdminStatusBadge status={payment.status} /> },
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
