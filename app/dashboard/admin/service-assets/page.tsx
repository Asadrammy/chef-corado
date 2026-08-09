import { AdminActionForm } from "@/components/admin/admin-action-form"
import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, parseJsonList } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { prisma } from "@/lib/prisma"

const statuses = ["ACTIVE", "INACTIVE", "REVIEW_REQUIRED", "ARCHIVED", "REJECTED"].map((value) => ({ label: value.replace(/_/g, " "), value }))

export default async function AdminServiceAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; serviceType?: string; q?: string }>
}) {
  await requireAdminPagePermission("serviceAssets.view")
  const params = await searchParams

  const assets = await prisma.serviceAsset.findMany({
    where: {
      status: params.status && params.status !== "all" ? params.status : undefined,
      serviceType: params.serviceType && params.serviceType !== "all" ? params.serviceType : undefined,
      OR: params.q
        ? [
            { serviceType: { contains: params.q, mode: "insensitive" } },
            { altText: { contains: params.q, mode: "insensitive" } },
            { source: { contains: params.q, mode: "insensitive" } },
            { licence: { contains: params.q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ serviceType: "asc" }, { createdAt: "desc" }],
    take: 100,
  })

  const serviceTypes = [...new Set(assets.map((asset) => asset.serviceType))].sort()

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Platform"
        title="Service Assets"
        description="Govern service imagery, licensing, source provenance, usage metadata, approvals, replacements, inactive states, and archive policy."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Assets", value: assets.length },
          { label: "Client approved", value: assets.filter((asset) => asset.clientApproved).length },
          { label: "Licence review", value: assets.filter((asset) => asset.status === "REVIEW_REQUIRED" || !asset.licence).length },
          { label: "Archived", value: assets.filter((asset) => asset.status === "ARCHIVED").length },
        ]}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search assets" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="serviceType" defaultValue={params.serviceType ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All service types</option>
            {serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All states</option>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
        <AdminReviewDrawer title="Record Service Asset" description="Create a governed image record with source, usage, accessibility, and licensing metadata." triggerLabel="Record asset">
          <AdminDrawerSection title="Asset Metadata">
            <AdminActionForm
              endpoint="/api/admin/service-assets"
              method="POST"
              compact
              submitLabel="Record asset"
              fields={[
                { name: "serviceType", label: "Service type" },
                { name: "imageUrl", label: "Image URL" },
                { name: "altText", label: "Alt text" },
                { name: "status", label: "Status", type: "select", defaultValue: "REVIEW_REQUIRED", options: statuses },
              ]}
            />
          </AdminDrawerSection>
        </AdminReviewDrawer>
      </AdminToolbar>
      <AdminDataTable
        rows={assets}
        emptyTitle="No service assets found."
        emptyDescription="Upload or record approved assets before exposing imagery in service-type placements."
        columns={[
          {
            key: "preview",
            label: "Preview",
            render: (asset) => <img src={asset.imageUrl} alt={asset.altText} className="h-14 w-20 rounded-md border border-border object-cover" />,
          },
          { key: "service", label: "Service", render: (asset) => <div><p className="font-medium">{asset.serviceType}</p><p className="text-xs text-muted-foreground">{asset.altText}</p></div> },
          { key: "source", label: "Source / licence", render: (asset) => <div><p>{asset.source ?? "Source not recorded"}</p><p className="text-xs text-muted-foreground">{asset.photographer ?? "Photographer not recorded"} / {asset.licence ?? "Licence review required"}</p></div> },
          { key: "approval", label: "Approval", render: (asset) => <div className="space-y-1"><AdminStatusBadge status={asset.clientApproved ? "VERIFIED" : "REVIEW_REQUIRED"} /><p className="text-xs text-muted-foreground">{asset.suppliedByClient ? "Client supplied" : "Platform supplied"}</p></div> },
          { key: "usage", label: "Usage", render: (asset) => parseJsonList(asset.usageLocations).join(", ") || asset.usageLocations || "Not assigned" },
          { key: "status", label: "Status", render: (asset) => <AdminStatusBadge status={asset.status} /> },
          { key: "created", label: "Created", render: (asset) => formatAdminDate(asset.createdAt) },
          {
            key: "actions",
            label: "Review",
            render: (asset) => (
              <AdminReviewDrawer title={`${asset.serviceType} Asset`} description="Review visual preview, provenance, licence status, and usage before changing asset state.">
                <AdminDrawerSection title="Preview">
                  <img src={asset.imageUrl} alt={asset.altText} className="aspect-video w-full rounded-lg border border-border object-cover" />
                </AdminDrawerSection>
                <AdminDrawerSection title="Governance">
                  <AdminInfoGrid
                    items={[
                      { label: "Source", value: asset.source ?? "Source not recorded" },
                      { label: "Photographer", value: asset.photographer ?? "Photographer not recorded" },
                      { label: "Licence", value: asset.licence ?? "Licence review required" },
                      { label: "Usage", value: parseJsonList(asset.usageLocations).join(", ") || asset.usageLocations || "Not assigned" },
                      { label: "Client supplied", value: asset.suppliedByClient ? "Yes" : "No" },
                      { label: "Client approved", value: asset.clientApproved ? "Yes" : "No" },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Edit Metadata" description="Replacing the image keeps the asset record and provenance visible.">
                  <AdminActionForm
                    endpoint="/api/admin/service-assets"
                    method="POST"
                    compact
                    submitLabel="Save asset"
                    fields={[
                      { name: "id", type: "hidden", defaultValue: asset.id },
                      { name: "serviceType", label: "Service", defaultValue: asset.serviceType },
                      { name: "imageUrl", label: "Image", defaultValue: asset.imageUrl },
                      { name: "altText", label: "Alt", defaultValue: asset.altText },
                      { name: "source", label: "Source", defaultValue: asset.source, nullable: true },
                      { name: "licence", label: "Licence", defaultValue: asset.licence, nullable: true },
                      { name: "clientApproved", label: "Approved", type: "checkbox", defaultValue: asset.clientApproved },
                      { name: "status", label: "Status", type: "select", defaultValue: asset.status, options: statuses },
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
