import { AdminActionForm } from "@/components/admin/admin-action-form"
import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar, AdminWarning } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const actor = await requireAdminPagePermission("payouts.process")
  const params = await searchParams
  const payouts = await prisma.payout.findMany({
    where: {
      status: params.status && params.status !== "all" ? params.status : undefined,
      OR: params.q
        ? [
            { chef: { user: { name: { contains: params.q, mode: "insensitive" } } } },
            { chef: { user: { email: { contains: params.q, mode: "insensitive" } } } },
            { externalReference: { contains: params.q, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { chef: { include: { user: { select: { name: true, email: true } } } }, ledgerEntries: { orderBy: { createdAt: "desc" }, take: 3 } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  })

  const totals = new Map<string, number>()
  payouts.forEach((payout) => {
    const currency = (payout.currency || "GBP").toUpperCase()
    totals.set(currency, (totals.get(currency) ?? 0) + payout.amount)
  })
  const displayedTotal = Array.from(totals.entries())
    .map(([currency, amount]) => formatCurrency(amount, currency))
    .join(" / ") || formatCurrency(0, "GBP")

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Finance"
        title="Payouts"
        description="Manual payout review queue with explicit non-Stripe references. Actions are permission-protected and audit logged."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Pending", value: payouts.filter((payout) => payout.status === "PENDING").length },
          { label: "Processing", value: payouts.filter((payout) => payout.status === "PROCESSING").length },
          { label: "Paid", value: payouts.filter((payout) => ["PAID", "COMPLETED"].includes(payout.status)).length },
          { label: "Displayed total", value: displayedTotal, helper: "Currency-separated; no FX conversion is applied." },
        ]}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search payouts" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All statuses</option>
            {["PENDING", "APPROVED", "PROCESSING", "PAID", "COMPLETED", "FAILED", "CANCELLED"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={payouts}
        emptyTitle="No payouts found."
        columns={[
          { key: "chef", label: "Chef", render: (payout) => <div><p className="font-medium">{payout.chef.user.name}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(payout.chef.user.email, actor)}</p></div> },
          { key: "amount", label: "Amount", render: (payout) => formatCurrency(payout.amount, payout.currency || "GBP") },
          { key: "status", label: "Status", render: (payout) => <AdminStatusBadge status={payout.status} /> },
          { key: "reference", label: "Reference", render: (payout) => payout.externalReference ?? payout.stripeTransferId ?? "Not recorded" },
          { key: "timestamps", label: "Lifecycle", render: (payout) => <div><p>Created: {formatAdminDate(payout.createdAt)}</p><p className="text-xs text-muted-foreground">Approved: {formatAdminDate(payout.approvedAt)}</p><p className="text-xs text-muted-foreground">Processed: {formatAdminDate(payout.processedAt)}</p></div> },
          { key: "failure", label: "Failure", render: (payout) => payout.failureReason ?? "None" },
          {
            key: "actions",
            label: "Review",
            render: (payout) => (
              <AdminReviewDrawer title={`Payout ${payout.id}`} description="Review chef payout state, manual reference, and lifecycle before applying a finance action.">
                <AdminWarning>Manual payout updates should reflect the real external banking state. Do not mark paid without a reliable reference.</AdminWarning>
                <AdminDrawerSection title="Payout Summary">
                  <AdminInfoGrid
                    items={[
                      { label: "Chef", value: `${payout.chef.user.name} / ${maskEmailForAdmin(payout.chef.user.email, actor)}` },
                      { label: "Amount", value: formatCurrency(payout.amount, payout.currency || "GBP") },
                      { label: "Status", value: <AdminStatusBadge status={payout.status} /> },
                      { label: "Reference", value: payout.externalReference ?? payout.stripeTransferId ?? "Not recorded" },
                      { label: "Approved", value: formatAdminDate(payout.approvedAt) },
                      { label: "Processed", value: formatAdminDate(payout.processedAt) },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Finance Action" description="Actions are audit logged and should match the payout lifecycle.">
                  <AdminActionForm
                    endpoint={`/api/admin/payouts/${payout.id}`}
                    compact
                    submitLabel="Apply payout action"
                    fields={[
                      { name: "action", label: "Action", type: "select", defaultValue: payout.status === "PENDING" ? "approve" : "pay", options: ["approve", "process", "pay", "complete", "fail", "cancel", "retry"].map((action) => ({ label: action, value: action })) },
                      { name: "externalReference", label: "Reference", defaultValue: payout.externalReference, nullable: true },
                      { name: "failureReason", label: "Failure", defaultValue: payout.failureReason, nullable: true },
                      { name: "adminNotes", label: "Notes", defaultValue: payout.adminNotes, nullable: true },
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
