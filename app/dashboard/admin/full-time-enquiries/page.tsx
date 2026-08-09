import { AdminActionForm } from "@/components/admin/admin-action-form"
import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"

const pipeline = ["NEW", "QUALIFICATION", "SHORTLISTING", "CANDIDATE_CONTACT", "INTERVIEW", "OFFER_PLACEMENT", "WON", "LOST", "CLOSED"].map((value) => ({ label: value.replace(/_/g, " "), value }))

export default async function AdminFullTimeEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; assignee?: string }>
}) {
  const actor = await requireAdminPagePermission("fullTimeEnquiries.view")
  const params = await searchParams
  const [enquiries, assignees] = await Promise.all([
    prisma.fullTimeChefEnquiry.findMany({
      where: {
        status: params.status && params.status !== "all" ? params.status : undefined,
        assignedTo: params.assignee && params.assignee !== "all" ? params.assignee : undefined,
        OR: params.q
          ? [
              { location: { contains: params.q, mode: "insensitive" } },
              { responsibilities: { contains: params.q, mode: "insensitive" } },
              { cuisineTypes: { contains: params.q, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: { client: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.user.findMany({ where: { role: "ADMIN", adminDisabledAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title="Full-Time Chef Enquiries"
        description="Placement-style pipeline for household chef enquiries, kept separate from normal event checkout and payment flow."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Open pipeline", value: enquiries.filter((item) => !["WON", "LOST", "CLOSED"].includes(item.status)).length },
          { label: "Qualification", value: enquiries.filter((item) => item.status === "QUALIFICATION").length },
          { label: "Offer / placement", value: enquiries.filter((item) => item.status === "OFFER_PLACEMENT").length },
          { label: "Closed", value: enquiries.filter((item) => ["WON", "LOST", "CLOSED"].includes(item.status)).length },
        ]}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search placements" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All statuses</option>{pipeline.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
          <select name="assignee" defaultValue={params.assignee ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All assignees</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={enquiries}
        emptyTitle="No full-time enquiries found."
        columns={[
          { key: "client", label: "Client", render: (item) => <div><p className="font-medium">{item.client.name}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(item.client.email, actor)}</p></div> },
          { key: "location", label: "Location", render: (item) => `${item.location}, ${item.countryCode}` },
          { key: "start", label: "Start / duration", render: (item) => <div><p>{item.desiredStartDate.toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{item.expectedDuration}</p></div> },
          { key: "living", label: "Live-in/out", render: (item) => item.liveInPreference },
          { key: "schedule", label: "Schedule", render: (item) => <div><p>{item.workingDays}</p><p className="text-xs text-muted-foreground">{item.workingHours}</p></div> },
          { key: "budget", label: "Budget", render: (item) => item.budgetAmount ? `${formatCurrency(item.budgetAmount, item.currency)} ${item.budgetPeriod ?? ""}` : "Not set" },
          { key: "needs", label: "Requirements", render: (item) => <div><p>{item.cuisineTypes ?? "Cuisine not set"}</p><p className="text-xs text-muted-foreground">{item.legalWorkRequirements ?? "Compliance needs not recorded"}</p></div> },
          { key: "status", label: "Pipeline", render: (item) => <AdminStatusBadge status={item.status} /> },
          {
            key: "actions",
            label: "Placement update",
            render: (item) => (
              <AdminReviewDrawer title={`${item.client.name} Placement Enquiry`} description="Review household needs, schedule, budget, compliance requirements, and pipeline state.">
                <AdminDrawerSection title="Household And Role">
                  <AdminInfoGrid
                    items={[
                      { label: "Client", value: `${item.client.name} / ${maskEmailForAdmin(item.client.email, actor)}` },
                      { label: "Location", value: `${item.location}, ${item.countryCode}` },
                      { label: "Start", value: item.desiredStartDate.toLocaleDateString() },
                      { label: "Duration", value: item.expectedDuration },
                      { label: "Living preference", value: item.liveInPreference },
                      { label: "Budget", value: item.budgetAmount ? `${formatCurrency(item.budgetAmount, item.currency)} ${item.budgetPeriod ?? ""}` : "Not set" },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Requirements">
                  <p className="text-sm leading-6 text-muted-foreground">{item.responsibilities ?? "Responsibilities not recorded."}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.dietaryRequirements ?? item.cuisineTypes ?? "Cuisine or dietary needs not recorded."}</p>
                </AdminDrawerSection>
                <AdminDrawerSection title="Pipeline Update">
                  <AdminActionForm
                    endpoint={`/api/admin/full-time-enquiries/${item.id}`}
                    compact
                    submitLabel="Save placement update"
                    fields={[
                      { name: "assignedTo", label: "Assignee", type: "select", nullable: true, defaultValue: item.assignedTo, options: assignees.map((user) => ({ label: user.name, value: user.id })) },
                      { name: "status", label: "Status", type: "select", defaultValue: item.status, options: pipeline },
                      { name: "closedReason", label: "Close reason", defaultValue: item.closedReason, nullable: true },
                      { name: "internalNotes", label: "Notes", defaultValue: item.internalNotes, nullable: true },
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
