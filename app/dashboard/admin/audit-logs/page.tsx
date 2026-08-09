import { AdminDataTable, AdminInfoGrid, AdminMetricGrid, AdminPageHeader, AdminStatusBadge, AdminToolbar } from "@/components/admin/admin-workspace"
import { AdminDrawerSection, AdminReviewDrawer } from "@/components/admin/admin-review-drawer"
import { formatAdminDate } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { prisma } from "@/lib/prisma"

function summarizeJson(value?: string | null) {
  if (!value) return "Not recorded"
  try {
    const parsed = JSON.parse(value)
    const safe = JSON.stringify(parsed, (_key, item) => {
      if (typeof item === "string" && item.length > 120) return `${item.slice(0, 120)}...`
      return item
    })
    return safe.length > 260 ? `${safe.slice(0, 260)}...` : safe
  } catch {
    return value.length > 260 ? `${value.slice(0, 260)}...` : value
  }
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; action?: string; actor?: string; q?: string; page?: string }>
}) {
  await requireAdminPagePermission("auditLogs.view")
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1) || 1)
  const take = 50
  const where = {
    entityType: params.entityType || undefined,
    action: params.action || undefined,
    performedBy: params.actor || undefined,
    OR: params.q
      ? [
          { entityId: { contains: params.q, mode: "insensitive" as const } },
          { reason: { contains: params.q, mode: "insensitive" as const } },
        ]
      : undefined,
  }
  const [auditLogs, total, actionRows, entityRows] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.groupBy({ by: ["entityType"], _count: { _all: true }, orderBy: { entityType: "asc" } }),
  ])

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Platform" title="Audit Logs" description="Searchable audit trail for privileged admin changes. Values are summarized to avoid exposing large payloads or secrets." />
      <AdminMetricGrid metrics={[
        { label: "Matching logs", value: total },
        { label: "Current page", value: page },
        { label: "Action types", value: actionRows.length },
        { label: "Entity types", value: entityRows.length },
      ]} />
      <AdminToolbar>
        <form className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Entity ID or reason" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="entityType" defaultValue={params.entityType ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">All entities</option>{entityRows.map((row) => <option key={row.entityType}>{row.entityType}</option>)}</select>
          <select name="action" defaultValue={params.action ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">All actions</option>{actionRows.map((row) => <option key={row.action}>{row.action}</option>)}</select>
          <input name="actor" defaultValue={params.actor ?? ""} placeholder="Actor ID" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          <button className="h-9 rounded-md border border-border px-3 text-sm font-medium">Apply</button>
        </form>
      </AdminToolbar>
      <AdminDataTable
        rows={auditLogs}
        emptyTitle="No audit logs found."
        columns={[
          { key: "time", label: "Time", render: (log) => formatAdminDate(log.createdAt) },
          { key: "action", label: "Action", render: (log) => <AdminStatusBadge status={log.action} /> },
          { key: "entity", label: "Target", render: (log) => <div><p>{log.entityType}</p><p className="text-xs text-muted-foreground">{log.entityId}</p></div> },
          { key: "actor", label: "Actor", render: (log) => log.performedBy },
          { key: "reason", label: "Reason", render: (log) => log.reason ?? "Not recorded" },
          { key: "changes", label: "Change summary", render: (log) => <div className="max-w-md break-words font-mono text-xs text-muted-foreground">{summarizeJson(log.newValue)}</div> },
          {
            key: "detail",
            label: "Review",
            render: (log) => (
              <AdminReviewDrawer title={log.action} description="Inspect summarized audit metadata without exposing oversized payloads in the table.">
                <AdminDrawerSection title="Audit Metadata">
                  <AdminInfoGrid
                    items={[
                      { label: "Time", value: formatAdminDate(log.createdAt) },
                      { label: "Action", value: <AdminStatusBadge status={log.action} /> },
                      { label: "Entity", value: `${log.entityType} / ${log.entityId}` },
                      { label: "Actor", value: log.performedBy },
                      { label: "IP address", value: log.ipAddress ?? "Not recorded" },
                      { label: "Reason", value: log.reason ?? "Not recorded" },
                    ]}
                  />
                </AdminDrawerSection>
                <AdminDrawerSection title="Old Value">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">{summarizeJson(log.oldValue)}</pre>
                </AdminDrawerSection>
                <AdminDrawerSection title="New Value">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">{summarizeJson(log.newValue)}</pre>
                </AdminDrawerSection>
              </AdminReviewDrawer>
            ),
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">Showing {auditLogs.length} of {total} matching audit records. Use the page query parameter for older entries.</p>
    </div>
  )
}
