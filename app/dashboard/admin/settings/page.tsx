import { AdminDataTable, AdminMetricGrid, AdminPageHeader, AdminStatusBadge } from "@/components/admin/admin-workspace"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { prisma } from "@/lib/prisma"

export default async function AdminSettingsPage() {
  await requireAdminPagePermission("platformSettings.manage")
  const [activeRules, draftRules, activeAssets, adminRoles] = await Promise.all([
    prisma.servicePricingRule.count({ where: { status: "ACTIVE" } }),
    prisma.servicePricingRule.count({ where: { status: { in: ["DRAFT", "REVIEW"] } } }),
    prisma.serviceAsset.count({ where: { status: "ACTIVE" } }),
    prisma.user.groupBy({ by: ["adminRole"], where: { role: "ADMIN" }, _count: { _all: true } }),
  ])

  const settings = [
    { id: "platform-currency", group: "Platform", setting: "Default operating market", value: "GB / GBP", state: "CODE_BACKED", effect: "Used by request and pricing defaults." },
    { id: "booking-pricing", group: "Booking", setting: "Active service pricing rules", value: String(activeRules), state: "LIVE_DATA", effect: "Configured through Service Pricing, not free-form settings." },
    { id: "booking-drafts", group: "Booking", setting: "Draft/review pricing rules", value: String(draftRules), state: "LIVE_DATA", effect: "Requires pricing lifecycle permissions to activate." },
    { id: "support", group: "Support", setting: "Support queue", value: "Enabled", state: "LIVE_DATA", effect: "Tickets are persisted and actioned through Support Tickets." },
    { id: "compliance", group: "Compliance", setting: "Certificate/background review", value: "Enabled", state: "LIVE_DATA", effect: "Mutations are permission-protected and audit logged." },
    { id: "branding", group: "Branding", setting: "Service imagery records", value: String(activeAssets), state: "LIVE_DATA", effect: "Governed through Service Assets." },
    { id: "finance", group: "Finance", setting: "M-Pesa", value: "Future only", state: "READ_ONLY", effect: "No active provider is presented to users." },
    { id: "features", group: "Feature Availability", setting: "Full-time enquiries", value: "Enabled", state: "LIVE_DATA", effect: "Separate placement pipeline, not event checkout." },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Platform"
        title="Settings"
        description="Real platform settings and operational state only. Code-backed configuration is shown read-only instead of creating controls with no backend effect."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Active pricing rules", value: activeRules },
          { label: "Draft/review rules", value: draftRules },
          { label: "Active service assets", value: activeAssets },
          { label: "Admin role groups", value: adminRoles.length },
        ]}
      />
      <AdminDataTable
        rows={settings}
        emptyTitle="No settings found."
        columns={[
          { key: "group", label: "Group", render: (row) => row.group },
          { key: "setting", label: "Setting", render: (row) => row.setting },
          { key: "value", label: "Current value", render: (row) => row.value },
          { key: "state", label: "Persistence", render: (row) => <AdminStatusBadge status={row.state} /> },
          { key: "effect", label: "Effect", render: (row) => row.effect },
        ]}
      />
    </div>
  )
}
