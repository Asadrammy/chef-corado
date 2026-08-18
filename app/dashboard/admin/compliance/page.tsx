import { AdminActionForm } from "@/components/admin/admin-action-form"
import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { prisma } from "@/lib/prisma"

export default async function AdminCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const actor = await requireAdminPagePermission("certificates.view")
  const params = await searchParams
  const chefs = await prisma.chefProfile.findMany({
    where: {
      foodHygieneCertificateReviewStatus: params.status && params.status !== "all" ? params.status : undefined,
      OR: params.q
        ? [
            { user: { name: { contains: params.q, mode: "insensitive" } } },
            { user: { email: { contains: params.q, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ foodHygieneCertificateReviewStatus: "asc" }, { updatedAt: "desc" }],
    take: 100,
  })
  const backgroundCheckModel = (prisma as unknown as {
    backgroundCheck?: {
      findMany: (args: {
        where: { chefId: { in: string[] } }
        orderBy: { updatedAt: "desc" }
        select: { chefId: true; status: true }
      }) => Promise<{ chefId: string; status: string }[]>
    }
  }).backgroundCheck
  const backgroundChecks = backgroundCheckModel
    ? await backgroundCheckModel
        .findMany({
          where: { chefId: { in: chefs.map((chef) => chef.id) } },
          orderBy: { updatedAt: "desc" },
          select: { chefId: true, status: true },
        })
        .catch(() => [])
    : []
  const latestBackgroundStatusByChef = new Map<string, string>()
  backgroundChecks.forEach((check) => {
    if (!latestBackgroundStatusByChef.has(check.chefId)) {
      latestBackgroundStatusByChef.set(check.chefId, check.status)
    }
  })
  const rows = chefs.map((chef) => ({
    ...chef,
    latestBackgroundCheckStatus: latestBackgroundStatusByChef.get(chef.id),
  }))

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Users & Compliance"
        title="Compliance"
        description="Food Hygiene, right-to-work, background check, and chef platform approval review. ChefaChef platform insurance applies to eligible official bookings; admins do not upload chef-specific insurance certificates here."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Pending certificates", value: rows.filter((chef) => chef.foodHygieneCertificateReviewStatus === "PENDING").length },
          { label: "Approved certificates", value: rows.filter((chef) => chef.foodHygieneCertificateReviewStatus === "APPROVED").length },
          { label: "Rejected certificates", value: rows.filter((chef) => chef.foodHygieneCertificateReviewStatus === "REJECTED").length },
          { label: "Right-to-work confirmed", value: rows.filter((chef) => chef.rightToWorkUkConfirmed).length },
        ]}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search chefs" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All certificate states</option>
            {["PENDING", "APPROVED", "REJECTED", "MISSING"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={rows}
        emptyTitle="No compliance records found."
        columns={[
          { key: "chef", label: "Chef", render: (chef) => <div><p className="font-medium">{chef.user.name}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(chef.user.email, actor)}</p></div> },
          { key: "rtw", label: "Right to work", render: (chef) => <AdminStatusBadge status={chef.rightToWorkUkConfirmed ? "APPROVED" : "PENDING"} /> },
          { key: "food", label: "Food Hygiene L2", render: (chef) => <div><AdminStatusBadge status={chef.foodHygieneCertificateReviewStatus ?? "MISSING"} /><p className="mt-1 text-xs text-muted-foreground">{chef.foodHygieneLevel2Confirmed ? "Level 2 confirmed" : "Level 2 not confirmed"}</p></div> },
          { key: "insurance", label: "Platform insurance", render: () => "ChefaChef booking cover" },
          { key: "background", label: "Background check", render: (chef) => chef.latestBackgroundCheckStatus ? <AdminStatusBadge status={chef.latestBackgroundCheckStatus} /> : "Not started" },
          { key: "verification", label: "Chef account", render: (chef) => <AdminStatusBadge status={chef.verificationStatus} /> },
          { key: "dates", label: "Relevant dates", render: (chef) => <div><p>Updated: {formatAdminDate(chef.updatedAt)}</p><p className="text-xs text-muted-foreground">Approved: {formatAdminDate(chef.approvedAt)}</p></div> },
          {
            key: "actions",
            label: "Review",
            render: (chef) => (
              <AdminReviewDrawer title={`${chef.user.name} Compliance`} description="Review Food Hygiene evidence, right-to-work confirmation, background checks, and chef account approval. Platform insurance is not a chef-uploaded document.">
                <AdminDrawerSection title="Compliance Summary">
                  <AdminInfoGrid
                    items={[
                      { label: "Chef", value: `${chef.user.name} / ${maskEmailForAdmin(chef.user.email, actor)}` },
                      { label: "Right to work", value: <AdminStatusBadge status={chef.rightToWorkUkConfirmed ? "APPROVED" : "PENDING"} /> },
                      { label: "Food Hygiene L2", value: <AdminStatusBadge status={chef.foodHygieneCertificateReviewStatus ?? "MISSING"} /> },
                      { label: "Platform insurance", value: "Covered by ChefaChef for qualifying official bookings" },
                      { label: "Background check", value: chef.latestBackgroundCheckStatus ? <AdminStatusBadge status={chef.latestBackgroundCheckStatus} /> : "Not started" },
                      { label: "Updated", value: formatAdminDate(chef.updatedAt) },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Food Hygiene Evidence" description="Inspect the submitted Level 2 Food Hygiene evidence before deciding on the chef account.">
                  {chef.foodHygieneCertificateUrl ? (
                    <a href={chef.foodHygieneCertificateUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                      Open uploaded certificate
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No Food Hygiene certificate uploaded.</p>
                  )}
                </AdminDrawerSection>
                <AdminDrawerSection title="Approve Chef Account" description="Use this only when Food Hygiene evidence and account review are acceptable. This does not change email verification.">
                  <AdminActionForm endpoint="/api/admin/verification" method="POST" compact submitLabel="Approve chef account" fields={[{ name: "chefId", type: "hidden", defaultValue: chef.id }, { name: "action", type: "hidden", defaultValue: "APPROVE" }, { name: "reason", label: "Note", placeholder: "Approval note" }]} />
                </AdminDrawerSection>
                <AdminDrawerSection title="Reject Chef Account" description="Provide a clear reason for the audit trail and staff follow-up.">
                  <AdminActionForm endpoint="/api/admin/verification" method="POST" compact submitLabel="Reject chef account" fields={[{ name: "chefId", type: "hidden", defaultValue: chef.id }, { name: "action", type: "hidden", defaultValue: "REJECT" }, { name: "reason", label: "Reason", placeholder: "Rejection reason" }]} />
                </AdminDrawerSection>
              </AdminReviewDrawer>
            ),
          },
        ]}
      />
    </div>
  )
}
