import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { FileText, Filter, Search, User, Clock } from "lucide-react"

import { authOptions } from "@/lib/auth"
import { generateMeta } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export const metadata: Metadata = generateMeta({
  title: "Audit Logs",
  description: "View system audit trail",
})

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; action?: string }>
}) {
  const params = await searchParams
  const entityType = params.entityType
  const action = params.action
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  cookies()

  const where: any = {}
  if (entityType) {
    where.entityType = entityType
  }
  if (action) {
    where.action = action
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const uniqueEntityTypes = [...new Set(auditLogs.map((log) => log.entityType))]
  const uniqueActions = [...new Set(auditLogs.map((log) => log.action))]

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">View system actions and changes</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Filter by entity type..."
          className="max-w-xs"
        />
        <Input
          placeholder="Filter by action..."
          className="max-w-xs"
        />
      </div>

      {auditLogs.length === 0 ? (
        <div className="rounded-[30px] border border-white/60 bg-white/72 py-12 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
              <FileText className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">No audit logs found</h2>
            <p className="mt-2 text-sm text-muted-foreground">Audit logs will appear here when system actions are performed.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {auditLogs.map((log) => (
            <Card
              key={log.id}
              className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{log.action}</h3>
                      <p className="text-sm text-muted-foreground">
                        Entity: {log.entityType} ({log.entityId})
                      </p>
                    </div>
                    <Badge variant="secondary" className="rounded-full ml-auto">
                      {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Performed by:</p>
                      <p className="text-foreground">{log.performedBy}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reason:</p>
                      <p className="text-foreground">{log.reason}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">IP Address:</p>
                      <p className="text-foreground font-mono text-xs">{log.ipAddress}</p>
                    </div>
                    {log.newValue && (
                      <div>
                        <p className="text-muted-foreground">New Value:</p>
                        <pre className="text-foreground bg-muted/30 p-2 rounded-lg overflow-x-auto text-xs">
                          {JSON.stringify(JSON.parse(log.newValue), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
