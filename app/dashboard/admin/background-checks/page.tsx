import { AdminActionForm } from "@/components/admin/admin-action-form"
import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar, AdminWarning } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { prisma } from "@/lib/prisma"

const statuses = ["NOT_STARTED", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"].map((value) => ({ label: value.replace(/_/g, " "), value }))

type BackgroundCheckRow = {
  id: string
  chefId: string
  checkType: string
  provider: string | null
  reference: string | null
  status: string
  submittedAt: Date | null
  reviewedAt: Date | null
  expiresAt: Date | null
  recheckAt: Date | null
  internalNotes: string | null
  chef: { user: { name: string; email: string } }
}

function getBackgroundCheckModel() {
  return (prisma as unknown as {
    backgroundCheck?: {
      findMany: (args: {
        where?: Record<string, unknown>
        include: { chef: { include: { user: { select: { name: true; email: true } } } } }
        orderBy: { status: "asc" }[] | ({ status: "asc" } | { updatedAt: "desc" })[]
        take: number
      }) => Promise<BackgroundCheckRow[]>
    }
  }).backgroundCheck
}

export default async function AdminBackgroundChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; checkType?: string }>
}) {
  const actor = await requireAdminPagePermission("backgroundChecks.view")
  const params = await searchParams
  const backgroundCheckModel = getBackgroundCheckModel()
  const [checks, chefs] = await Promise.all([
    backgroundCheckModel
      ? backgroundCheckModel.findMany({
          where: {
            status: params.status && params.status !== "all" ? params.status : undefined,
            checkType: params.checkType && params.checkType !== "all" ? params.checkType : undefined,
            OR: params.q
              ? [
                  { checkType: { contains: params.q, mode: "insensitive" } },
                  { provider: { contains: params.q, mode: "insensitive" } },
                  { reference: { contains: params.q, mode: "insensitive" } },
                ]
              : undefined,
          },
          include: { chef: { include: { user: { select: { name: true, email: true } } } } },
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
          take: 100,
        }).catch(() => [])
      : Promise.resolve([]),
    prisma.chefProfile.findMany({ orderBy: { updatedAt: "desc" }, take: 100, include: { user: { select: { name: true, email: true } } } }),
  ])

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Users & Compliance"
        title="Background Checks"
        description="Private review queue for chef background checks, provider references, expiry/recheck dates, reviewer state, and audit logged outcomes."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Checks", value: checks.length },
          { label: "Pending review", value: checks.filter((check) => ["PENDING", "UNDER_REVIEW"].includes(check.status)).length },
          { label: "Approved", value: checks.filter((check) => check.status === "APPROVED").length },
          { label: "Expired / rejected", value: checks.filter((check) => ["EXPIRED", "REJECTED"].includes(check.status)).length },
        ]}
      />
      {!backgroundCheckModel ? (
        <AdminWarning>
          Background check storage is not available in the running Prisma Client yet. Apply the hardening migration, regenerate Prisma Client, and restart the dev server to enable create/review actions.
        </AdminWarning>
      ) : null}
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search checks" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All statuses</option>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
        {backgroundCheckModel ? (
          <AdminReviewDrawer title="Create Background Check" description="Create a private compliance record for a chef." triggerLabel="Create check">
            <AdminDrawerSection title="Check Details">
              <AdminActionForm
                endpoint="/api/admin/background-checks"
                method="POST"
                compact
                submitLabel="Create check"
                fields={[
                  { name: "chefId", label: "Chef", type: "select", options: chefs.map((chef) => ({ label: `${chef.user.name} (${maskEmailForAdmin(chef.user.email, actor)})`, value: chef.id })) },
                  { name: "checkType", label: "Type", defaultValue: "RIGHT_TO_WORK" },
                  { name: "provider", label: "Provider", nullable: true },
                  { name: "reference", label: "Reference", nullable: true },
                  { name: "status", label: "Status", type: "select", defaultValue: "PENDING", options: statuses },
                ]}
              />
            </AdminDrawerSection>
          </AdminReviewDrawer>
        ) : null}
      </AdminToolbar>
      <AdminDataTable
        rows={checks}
        emptyTitle="No background checks found."
        columns={[
          { key: "chef", label: "Chef", render: (check) => <div><p className="font-medium">{check.chef.user.name}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(check.chef.user.email, actor)}</p></div> },
          { key: "type", label: "Type", render: (check) => check.checkType },
          { key: "provider", label: "Provider / reference", render: (check) => <div><p>{check.provider ?? "Provider not recorded"}</p><p className="text-xs text-muted-foreground">{check.reference ?? "Reference private/not recorded"}</p></div> },
          { key: "status", label: "Status", render: (check) => <AdminStatusBadge status={check.status} /> },
          { key: "review", label: "Review dates", render: (check) => <div><p>Submitted: {formatAdminDate(check.submittedAt)}</p><p className="text-xs text-muted-foreground">Reviewed: {formatAdminDate(check.reviewedAt)}</p></div> },
          { key: "expiry", label: "Expiry / recheck", render: (check) => <div><p>{formatAdminDate(check.expiresAt)}</p><p className="text-xs text-muted-foreground">Recheck: {formatAdminDate(check.recheckAt)}</p></div> },
          {
            key: "actions",
            label: "Review",
            render: (check) => (
              <AdminReviewDrawer title={`${check.chef.user.name} Background Check`} description="Review provider state, dates, and private notes before changing compliance status.">
                <AdminDrawerSection title="Check Overview">
                  <AdminInfoGrid
                    items={[
                      { label: "Chef", value: `${check.chef.user.name} / ${maskEmailForAdmin(check.chef.user.email, actor)}` },
                      { label: "Type", value: check.checkType },
                      { label: "Provider", value: check.provider ?? "Provider not recorded" },
                      { label: "Reference", value: check.reference ?? "Reference private/not recorded" },
                      { label: "Status", value: <AdminStatusBadge status={check.status} /> },
                      { label: "Expiry", value: formatAdminDate(check.expiresAt) },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Review Decision" description="Sensitive data stays inside the private compliance workflow.">
                  <AdminActionForm
                    endpoint="/api/admin/background-checks"
                    compact
                    submitLabel="Save review"
                    fields={[
                      { name: "id", type: "hidden", defaultValue: check.id },
                      { name: "status", label: "Status", type: "select", defaultValue: check.status, options: statuses },
                      { name: "provider", label: "Provider", defaultValue: check.provider, nullable: true },
                      { name: "reference", label: "Reference", defaultValue: check.reference, nullable: true },
                      { name: "expiresAt", label: "Expiry", type: "datetime-local", nullable: true },
                      { name: "recheckAt", label: "Recheck", type: "datetime-local", nullable: true },
                      { name: "internalNotes", label: "Notes", defaultValue: check.internalNotes, nullable: true },
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
