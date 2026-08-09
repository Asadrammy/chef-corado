import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; currency?: string; q?: string }>
}) {
  const actor = await requireAdminPagePermission("invoices.manage")
  const params = await searchParams
  const invoices = await prisma.invoice.findMany({
    where: {
      status: params.status && params.status !== "all" ? params.status : undefined,
      currency: params.currency && params.currency !== "all" ? params.currency : undefined,
      OR: params.q
        ? [
            { invoiceNumber: { contains: params.q, mode: "insensitive" } },
            { recipientEmail: { contains: params.q, mode: "insensitive" } },
            { bookingId: { contains: params.q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  const currencies = [...new Set(invoices.map((invoice) => invoice.currency))].sort()

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Finance"
        title="Invoices"
        description="Immutable invoice snapshots with explicit tax fields only. No tax rate is invented when configuration is absent."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Invoices", value: invoices.length },
          { label: "Draft", value: invoices.filter((invoice) => invoice.status === "DRAFT").length },
          { label: "Issued / paid", value: invoices.filter((invoice) => ["ISSUED", "PAID"].includes(invoice.status)).length },
          { label: "Tax policy", value: "Explicit", helper: "Zero tax means no configured tax snapshot on the invoice." },
        ]}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Invoice, booking, email" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All statuses</option>{["DRAFT", "ISSUED", "PAID", "VOID"].map((status) => <option key={status}>{status}</option>)}</select>
          <select name="currency" defaultValue={params.currency ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All currencies</option>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={invoices}
        emptyTitle="No invoice records found."
        columns={[
          { key: "number", label: "Invoice", render: (invoice) => <div><p className="font-medium">{invoice.invoiceNumber}</p><p className="text-xs text-muted-foreground">{invoice.id}</p></div> },
          { key: "booking", label: "Booking / payment", render: (invoice) => <div><p>{invoice.bookingId ?? "No booking"}</p><p className="text-xs text-muted-foreground">{invoice.paymentId ?? "No payment"}</p></div> },
          { key: "recipient", label: "Recipient", render: (invoice) => <div><p>{invoice.recipientName ?? "Not recorded"}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(invoice.recipientEmail, actor)}</p></div> },
          { key: "subtotal", label: "Subtotal", render: (invoice) => formatCurrency(invoice.subtotalAmount, invoice.currency) },
          { key: "tax", label: "Tax", render: (invoice) => invoice.taxAmount > 0 ? formatCurrency(invoice.taxAmount, invoice.currency) : "Not configured" },
          { key: "total", label: "Total", render: (invoice) => formatCurrency(invoice.totalAmount, invoice.currency) },
          { key: "status", label: "Payment status", render: (invoice) => <AdminStatusBadge status={invoice.status} /> },
          { key: "dates", label: "Issue / paid", render: (invoice) => <div><p>{formatAdminDate(invoice.issuedAt)}</p><p className="text-xs text-muted-foreground">{formatAdminDate(invoice.paidAt)}</p></div> },
          {
            key: "detail",
            label: "Review",
            render: (invoice) => (
              <AdminReviewDrawer title={invoice.invoiceNumber} description="Review immutable invoice snapshot and payment state.">
                <AdminDrawerSection title="Invoice Snapshot">
                  <AdminInfoGrid
                    items={[
                      { label: "Recipient", value: `${invoice.recipientName ?? "Not recorded"} / ${maskEmailForAdmin(invoice.recipientEmail, actor)}` },
                      { label: "Booking", value: invoice.bookingId ?? "No booking" },
                      { label: "Payment", value: invoice.paymentId ?? "No payment" },
                      { label: "Subtotal", value: formatCurrency(invoice.subtotalAmount, invoice.currency) },
                      { label: "Tax", value: invoice.taxAmount > 0 ? formatCurrency(invoice.taxAmount, invoice.currency) : "Not configured" },
                      { label: "Total", value: formatCurrency(invoice.totalAmount, invoice.currency) },
                      { label: "Status", value: <AdminStatusBadge status={invoice.status} /> },
                      { label: "Issued", value: formatAdminDate(invoice.issuedAt) },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Notes">
                  <p className="text-sm leading-6 text-muted-foreground">{invoice.internalNotes ?? "No internal notes recorded."}</p>
                </AdminDrawerSection>
              </AdminReviewDrawer>
            ),
          },
        ]}
      />
    </div>
  )
}
