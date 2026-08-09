import Link from "next/link"
import type { ReactNode } from "react"
import { AlertCircle, ArrowRight, Inbox } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type AdminMetric = {
  label: string
  value: ReactNode
  helper?: ReactNode
}

export type AdminTableColumn<T> = {
  key: string
  label: string
  className?: string
  render: (row: T) => ReactNode
}

const statusTones: Record<string, string> = {
  ACTIVE: "border-[hsl(var(--success)/0.24)] bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))]",
  APPROVED: "border-[hsl(var(--success)/0.24)] bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))]",
  PAID: "border-[hsl(var(--success)/0.24)] bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))]",
  COMPLETED: "border-[hsl(var(--success)/0.24)] bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))]",
  RESOLVED: "border-[hsl(var(--success)/0.24)] bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))]",
  VERIFIED: "border-[hsl(var(--success)/0.24)] bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))]",
  CONFIRMED: "border-primary/25 bg-primary/10 text-primary",
  PROCESSING: "border-primary/25 bg-primary/10 text-primary",
  REVIEW: "border-primary/25 bg-primary/10 text-primary",
  UNDER_REVIEW: "border-primary/25 bg-primary/10 text-primary",
  NEW: "border-border bg-muted/50 text-foreground",
  OPEN: "border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.10)] text-[hsl(var(--brand-chocolate))]",
  PENDING: "border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.10)] text-[hsl(var(--brand-chocolate))]",
  DRAFT: "border-border bg-muted/50 text-foreground",
  WAITING_ON_CUSTOMER: "border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.10)] text-[hsl(var(--brand-chocolate))]",
  REJECTED: "border-destructive/30 bg-destructive/10 text-destructive",
  FAILED: "border-destructive/30 bg-destructive/10 text-destructive",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
  CLOSED: "border-slate-200 bg-slate-50 text-slate-700",
  DISABLED: "border-slate-200 bg-slate-50 text-slate-700",
  ARCHIVED: "border-slate-200 bg-slate-50 text-slate-700",
  INACTIVE: "border-slate-200 bg-slate-50 text-slate-700",
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm shadow-black/[0.03]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-[1.65rem] font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

export function AdminToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm shadow-black/[0.03] lg:flex-row lg:items-center lg:justify-between", className)}>
      {children}
    </section>
  )
}

export function AdminMetricGrid({ metrics }: { metrics: AdminMetric[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={String(metric.label)} className="overflow-hidden rounded-xl border-border bg-card shadow-sm shadow-black/[0.03]">
          <CardContent className="relative p-4">
            <div className="absolute inset-y-4 left-0 w-0.5 rounded-r-full bg-primary/70" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
            <div className="mt-2 text-[1.55rem] font-semibold leading-none tracking-tight text-foreground">{metric.value}</div>
            {metric.helper ? <div className="mt-2 text-xs leading-5 text-muted-foreground">{metric.helper}</div> : null}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

export function AdminStatusBadge({ status }: { status?: string | null }) {
  const label = status || "UNKNOWN"
  const tone = statusTones[label] ?? "border-border bg-muted text-muted-foreground"
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]", tone)}>
      {label.replace(/_/g, " ")}
    </Badge>
  )
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full border border-border bg-background text-primary shadow-sm">
        <Inbox className="size-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function AdminDataTable<T extends { id: string }>({
  rows,
  columns,
  emptyTitle,
  emptyDescription,
}: {
  rows: T[]
  columns: AdminTableColumn<T>[]
  emptyTitle: string
  emptyDescription?: string
}) {
  if (rows.length === 0) {
    return <AdminEmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/[0.03]">
      <div className="max-h-[72vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={cn("h-11 whitespace-nowrap border-b text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground", column.className)}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="transition-colors hover:bg-muted/35">
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn("align-top py-4 text-sm", column.className)}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function AdminDetailLink({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <Button asChild variant="outline" size="sm" className="h-8 rounded-md">
      <Link href={href} className="inline-flex items-center gap-1.5">
        {children ?? "Open"}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </Button>
  )
}

export function AdminActivityTimeline({
  items,
  emptyText = "No activity recorded yet.",
}: {
  items: { id: string; action: string; meta?: string | null; createdAt?: Date | string | null }[]
  emptyText?: string
}) {
  if (items.length === 0) {
    return <p className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="relative border-l border-border pl-4">
          <span className="absolute -left-1.5 top-1.5 size-2.5 rounded-full border border-background bg-primary" />
          <p className="text-sm font-medium text-foreground">{item.action}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Date not recorded"}
            {item.meta ? ` - ${item.meta}` : ""}
          </p>
        </li>
      ))}
    </ol>
  )
}

export function AdminWarning({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.10)] px-4 py-3 text-sm text-[hsl(var(--brand-chocolate))]">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="leading-6">{children}</div>
    </div>
  )
}

export function AdminInfoGrid({
  items,
}: {
  items: { label: string; value: ReactNode }[]
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-muted/20 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-sm leading-6 text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
