import type { Prisma } from "@prisma/client"

import { AdminActionForm } from "@/components/admin/admin-action-form"
import {
  AdminActivityTimeline,
  AdminDataTable,
  AdminInfoGrid,
  AdminMetricGrid,
  AdminPageHeader,
  AdminStatusBadge,
  AdminToolbar,
  AdminWarning,
} from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMIN_PERMISSIONS, ADMIN_ROLE_LABELS, ADMIN_ROLE_PERMISSIONS, ADMIN_STAFF_ROLES } from "@/lib/admin-permissions"
import { formatAdminDate } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { isPrismaConnectionError, prisma, withPrismaReconnect } from "@/lib/prisma"

const roleOptions = ADMIN_STAFF_ROLES.map((role) => ({ label: ADMIN_ROLE_LABELS[role], value: role }))

type AdminStaffRow = Prisma.UserGetPayload<{
  select: {
    id: true
    name: true
    email: true
    adminRole: true
    adminDisabledAt: true
    adminPermissions: true
    adminLastPermissionChangeAt: true
    createdAt: true
  }
}>

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>
}) {
  await requireAdminPagePermission("admins.edit")
  const params = await searchParams

  let staff: AdminStaffRow[] = []
  let audits: Prisma.AuditLogGetPayload<object>[] = []
  let dataWarning: string | null = null

  try {
    ;[staff, audits] = await withPrismaReconnect(() =>
      Promise.all([
        prisma.user.findMany({
          where: {
            role: "ADMIN",
            adminRole: params.role && params.role !== "all" ? params.role : undefined,
            adminDisabledAt: params.status === "disabled" ? { not: null } : params.status === "active" ? null : undefined,
            OR: params.q
              ? [
                  { name: { contains: params.q, mode: "insensitive" } },
                  { email: { contains: params.q, mode: "insensitive" } },
                ]
              : undefined,
          },
          orderBy: [{ adminRole: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            email: true,
            adminRole: true,
            adminDisabledAt: true,
            adminPermissions: true,
            adminLastPermissionChangeAt: true,
            createdAt: true,
          },
        }),
        prisma.auditLog.findMany({
          where: { entityType: "User", action: { in: ["ADMIN_STAFF_CREATED", "ADMIN_STAFF_UPDATED", "ADMIN_STAFF_DISABLED", "ADMIN_STAFF_ENABLED"] } },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      ]),
      2
    )
  } catch (error) {
    if (!isPrismaConnectionError(error)) {
      throw error
    }

    dataWarning = "The database timed out while loading staff records. Refresh to retry; no staff or permission data was changed."
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Platform"
        title="Staff & Permissions"
        description="Manage invited admin staff, approved role assignment, account access, effective permissions, and audit history."
      />

      <AdminMetricGrid
        metrics={[
          { label: "Admin staff", value: staff.length },
          { label: "Active", value: staff.filter((user) => !user.adminDisabledAt).length },
          { label: "Disabled", value: staff.filter((user) => user.adminDisabledAt).length },
          { label: "Permission model", value: `${ADMIN_STAFF_ROLES.length} roles`, helper: `${ADMIN_PERMISSIONS.length} known permission IDs` },
        ]}
      />

      {dataWarning ? (
        <AdminWarning>{dataWarning}</AdminWarning>
      ) : null}

      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search name or email" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="role" defaultValue={params.role ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All roles</option>
            {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All access states</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
        {!dataWarning ? (
          <AdminReviewDrawer title="Invite Staff Member" description="Create a secure staff invitation without handling passwords in the admin UI." triggerLabel="Invite staff">
            <AdminDrawerSection title="Invitation">
              <AdminActionForm
                endpoint="/api/admin/staff"
                method="POST"
                compact
                submitLabel="Send invitation"
                fields={[
                  { name: "name", label: "Name", placeholder: "Full name" },
                  { name: "email", label: "Email", type: "email", placeholder: "person@example.com" },
                  { name: "adminRole", label: "Role", type: "select", options: roleOptions, defaultValue: "CUSTOMER_SUPPORT_SPECIALIST" },
                ]}
              />
            </AdminDrawerSection>
          </AdminReviewDrawer>
        ) : null}
      </AdminToolbar>

      <AdminDataTable
        rows={staff}
        emptyTitle="No admin staff found."
        columns={[
          { key: "person", label: "Staff member", render: (user) => <div><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div> },
          { key: "role", label: "Role", render: (user) => ADMIN_ROLE_LABELS[user.adminRole as keyof typeof ADMIN_ROLE_LABELS] ?? "Super Admin" },
          { key: "status", label: "Status", render: (user) => <AdminStatusBadge status={user.adminDisabledAt ? "DISABLED" : "ACTIVE"} /> },
          { key: "lastLogin", label: "Last login", render: () => "Not recorded" },
          { key: "created", label: "Created", render: (user) => formatAdminDate(user.createdAt) },
          {
            key: "actions",
            label: "Review",
            render: (user) => (
              <AdminReviewDrawer title={user.name} description="Review staff access, effective role, and account state before changing privileges.">
                <AdminDrawerSection title="Staff Overview">
                  <AdminInfoGrid
                    items={[
                      { label: "Email", value: user.email },
                      { label: "Current role", value: ADMIN_ROLE_LABELS[user.adminRole as keyof typeof ADMIN_ROLE_LABELS] ?? "Super Admin" },
                      { label: "Access state", value: <AdminStatusBadge status={user.adminDisabledAt ? "DISABLED" : "ACTIVE"} /> },
                      { label: "Created", value: formatAdminDate(user.createdAt) },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Role And Access" description="Privilege changes are audit logged and should match the staff member's operational responsibility.">
                  <AdminActionForm
                    endpoint="/api/admin/staff"
                    compact
                    submitLabel="Update staff access"
                    fields={[
                      { name: "userId", type: "hidden", defaultValue: user.id },
                      { name: "adminRole", label: "Role", type: "select", defaultValue: user.adminRole ?? "SUPER_ADMIN", options: roleOptions },
                      { name: "disabled", label: "Disabled", type: "checkbox", defaultValue: Boolean(user.adminDisabledAt) },
                    ]}
                  />
                </AdminDrawerSection>
              </AdminReviewDrawer>
            ),
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Permission Matrix</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {ADMIN_STAFF_ROLES.map((role) => (
              <div key={role} className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold">{ADMIN_ROLE_LABELS[role]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ADMIN_ROLE_PERMISSIONS[role].join(", ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recent Staff Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminActivityTimeline items={audits.map((log) => ({ id: log.id, action: log.action, meta: log.reason, createdAt: log.createdAt }))} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
