import { AdminActionForm } from "@/components/admin/admin-action-form"
import { AdminDataTable, AdminMetricGrid, AdminPageHeader, AdminStatusBadge } from "@/components/admin/admin-workspace"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { prisma } from "@/lib/prisma"
import { marketConfigurationService } from "@/lib/services/market-configuration-service"

export default async function AdminSettingsPage() {
  const actor = await requireAdminPagePermission("platformSettings.manage")
  const [activeRules, draftRules, activeAssets, adminRoles, markets, pricingByCountry] = await Promise.all([
    prisma.servicePricingRule.count({ where: { status: "ACTIVE" } }),
    prisma.servicePricingRule.count({ where: { status: { in: ["DRAFT", "REVIEW"] } } }),
    prisma.serviceAsset.count({ where: { status: "ACTIVE" } }),
    prisma.user.groupBy({ by: ["adminRole"], where: { role: "ADMIN" }, _count: { _all: true } }),
    marketConfigurationService.listMarketConfigurations(),
    prisma.servicePricingRule.groupBy({
      by: ["countryCode"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
  ])

  const activePricingByCountry = new Map(pricingByCountry.map((row) => [row.countryCode, row._count._all]))

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
        description="Operational settings, market activation, pricing readiness, and permission-protected configuration state."
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
      <AdminDataTable
        rows={markets.map((market) => ({
          id: market.countryCode,
          ...market,
          activePricingRules: activePricingByCountry.get(market.countryCode) ?? 0,
        }))}
        emptyTitle="No market configuration found."
        columns={[
          {
            key: "country",
            label: "Country",
            render: (market) => (
              <div>
                <p className="font-medium text-foreground">{market.countryName}</p>
                <p className="text-xs text-muted-foreground">{market.countryCode} / {market.currency} / {market.source}</p>
              </div>
            ),
          },
          { key: "status", label: "Market", render: (market) => <AdminStatusBadge status={market.marketStatus} /> },
          { key: "booking", label: "Bookings", render: (market) => <AdminStatusBadge status={market.bookingEnabled ? "ENABLED" : "DISABLED"} /> },
          { key: "payments", label: "Payments", render: (market) => <AdminStatusBadge status={market.paymentsEnabled ? "ENABLED" : "DISABLED"} /> },
          { key: "legal", label: "Legal", render: (market) => <AdminStatusBadge status={market.legalEnabled ? "ENABLED" : "PENDING"} /> },
          {
            key: "pricing",
            label: "Pricing",
            render: (market) => (
              <div>
                <p className="font-medium">{market.activePricingRules} active rules</p>
                <p className="text-xs text-muted-foreground">Pricing does not activate the market.</p>
              </div>
            ),
          },
          {
            key: "controls",
            label: "Super Admin controls",
            className: "min-w-[300px]",
            render: (market) => actor.adminRole === "SUPER_ADMIN" ? (
              <AdminActionForm
                endpoint="/api/admin/markets"
                method="PATCH"
                compact
                submitLabel="Update market"
                fields={[
                  { name: "countryCode", type: "hidden", defaultValue: market.countryCode },
                  { name: "active", type: "checkbox", label: "Active", defaultValue: market.marketStatus === "ACTIVE" },
                  { name: "legalEnabled", type: "checkbox", label: "Legal enabled", defaultValue: market.legalEnabled },
                  { name: "bookingEnabled", type: "checkbox", label: "Bookings enabled", defaultValue: market.bookingEnabled },
                  { name: "paymentsEnabled", type: "checkbox", label: "Payments enabled", defaultValue: market.paymentsEnabled },
                  { name: "internalNotes", type: "textarea", label: "Internal notes", defaultValue: market.internalNotes ?? "", nullable: true },
                  { name: "reason", type: "textarea", label: "Audit reason", placeholder: "Legal/business approval reference", nullable: true },
                ]}
              />
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">Read-only. Only Super Admin can change market activation.</p>
            ),
          },
        ]}
      />
    </div>
  )
}
