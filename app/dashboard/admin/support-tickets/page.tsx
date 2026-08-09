import { AdminActionForm } from "@/components/admin/admin-action-form"
import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate, maskEmailForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { prisma } from "@/lib/prisma"

const statuses = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"].map((value) => ({ label: value.replace(/_/g, " "), value }))
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({ label: value, value }))

export default async function AdminSupportTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; q?: string; assignee?: string }>
}) {
  const actor = await requireAdminPagePermission("supportTickets.view")
  const params = await searchParams

  const tickets = await prisma.supportTicket.findMany({
    where: {
      status: params.status && params.status !== "all" ? params.status : undefined,
      priority: params.priority && params.priority !== "all" ? params.priority : undefined,
      assignedTo: params.assignee && params.assignee !== "all" ? params.assignee : undefined,
      OR: params.q
        ? [
            { subject: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } },
            { requesterEmail: { contains: params.q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: { messages: { orderBy: { createdAt: "desc" }, take: 5 } },
    take: 100,
  })

  const assignees = await prisma.user.findMany({
    where: { role: "ADMIN", adminDisabledAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  })

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Support & Trust"
        title="Support Tickets"
        description="Operational queue for assignment, priority changes, status updates, internal notes, resolution, and reopen handling."
      />
      <AdminMetricGrid
        metrics={[
          { label: "Open queue", value: tickets.filter((ticket) => ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"].includes(ticket.status)).length },
          { label: "Urgent / high", value: tickets.filter((ticket) => ["HIGH", "URGENT"].includes(ticket.priority)).length },
          { label: "Resolved", value: tickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length },
          { label: "Unassigned", value: tickets.filter((ticket) => !ticket.assignedTo).length },
        ]}
      />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search tickets" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All statuses</option>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <select name="priority" defaultValue={params.priority ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All priorities</option>
            {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
          </select>
          <select name="assignee" defaultValue={params.assignee ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All assignees</option>
            {assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={tickets}
        emptyTitle="No support tickets found."
        columns={[
          { key: "ticket", label: "Ticket", render: (ticket) => <div><p className="font-medium">{ticket.subject}</p><p className="text-xs text-muted-foreground">{ticket.id}</p></div> },
          { key: "requester", label: "Requester", render: (ticket) => <div><p>{ticket.requesterRole ?? "Unknown"}</p><p className="text-xs text-muted-foreground">{maskEmailForAdmin(ticket.requesterEmail, actor)}</p></div> },
          { key: "category", label: "Category", render: (ticket) => ticket.category },
          { key: "priority", label: "Priority", render: (ticket) => <AdminStatusBadge status={ticket.priority} /> },
          { key: "status", label: "Status", render: (ticket) => <AdminStatusBadge status={ticket.status} /> },
          { key: "related", label: "Related", render: (ticket) => ticket.relatedBookingId ?? ticket.relatedPaymentId ?? ticket.relatedRequestId ?? "None" },
          { key: "created", label: "Created", render: (ticket) => formatAdminDate(ticket.createdAt) },
          {
            key: "actions",
            label: "Review",
            render: (ticket) => (
              <AdminReviewDrawer title={ticket.subject} description="Review the requester, related records, history, and resolution workflow.">
                <AdminDrawerSection title="Ticket Overview">
                  <AdminInfoGrid
                    items={[
                      { label: "Requester", value: `${ticket.requesterRole ?? "Unknown"} / ${maskEmailForAdmin(ticket.requesterEmail, actor)}` },
                      { label: "Category", value: ticket.category },
                      { label: "Priority", value: <AdminStatusBadge status={ticket.priority} /> },
                      { label: "Status", value: <AdminStatusBadge status={ticket.status} /> },
                      { label: "Related record", value: ticket.relatedBookingId ?? ticket.relatedPaymentId ?? ticket.relatedRequestId ?? "None" },
                      { label: "Created", value: formatAdminDate(ticket.createdAt) },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Issue Description">
                  <p className="text-sm leading-6 text-muted-foreground">{ticket.description}</p>
                </AdminDrawerSection>
                <AdminDrawerSection title="History And Notes">
                  <div className="space-y-2">
                    {ticket.messages.length ? ticket.messages.map((message) => (
                      <p key={message.id} className="rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                        {formatAdminDate(message.createdAt)}: {message.internal ? "Internal" : "Public"} - {message.message}
                      </p>
                    )) : <p className="text-sm text-muted-foreground">No notes recorded.</p>}
                  </div>
                </AdminDrawerSection>
                <AdminDrawerSection title="Update Ticket" description="Assignments, priority changes, status changes, and internal notes are recorded against the ticket.">
                  <AdminActionForm
                    endpoint="/api/admin/support-tickets"
                    compact
                    submitLabel="Save ticket update"
                    fields={[
                      { name: "ticketId", type: "hidden", defaultValue: ticket.id },
                      { name: "assignedTo", label: "Assignee", type: "select", nullable: true, defaultValue: ticket.assignedTo, options: assignees.map((user) => ({ label: user.name, value: user.id })) },
                      { name: "priority", label: "Priority", type: "select", defaultValue: ticket.priority, options: priorities },
                      { name: "status", label: "Status", type: "select", defaultValue: ticket.status, options: statuses },
                      { name: "message", label: "Internal note", placeholder: "Add note" },
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
