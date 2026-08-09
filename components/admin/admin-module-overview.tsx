import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Metric = {
  label: string
  value: string | number
  helper?: string
}

type Row = {
  id: string
  title: string
  subtitle?: string | null
  meta?: string | null
  status?: string | null
  href?: string
}

export function AdminModuleOverview({
  title,
  description,
  badge,
  metrics,
  rows,
  emptyText = "No records found.",
}: {
  title: string
  description: string
  badge: string
  metrics: Metric[]
  rows?: Row[]
  emptyText?: string
}) {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{badge}</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{metric.value}</p>
              {metric.helper ? <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p> : null}
            </CardContent>
          </Card>
        ))}
      </section>

      {rows ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Recent records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
            ) : rows.map((row) => {
              const content = (
                <div className="flex flex-col gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.title}</p>
                    {row.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{row.subtitle}</p> : null}
                    {row.meta ? <p className="mt-1 text-xs text-muted-foreground">{row.meta}</p> : null}
                  </div>
                  {row.status ? <Badge variant="secondary">{row.status}</Badge> : null}
                </div>
              )

              return row.href ? <Link key={row.id} href={row.href}>{content}</Link> : <div key={row.id}>{content}</div>
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
