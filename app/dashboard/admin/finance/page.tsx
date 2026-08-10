import { Metadata } from "next"
import { cookies } from "next/headers"
import { format } from "date-fns"
import { Wallet } from "lucide-react"

import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { generateMeta } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = generateMeta({
  title: "Finance Dashboard",
  description: "View financial transactions and ledger",
})

export default async function AdminFinancePage() {
  await requireAdminPagePermission("finance.view")

  cookies()

  const [ledgerEntries, payments, payouts, refunds] = await Promise.all([
    prisma.ledger.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.payment.findMany({
      include: {
        booking: {
          include: {
            client: { select: { id: true, name: true } },
            chef: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.payout.findMany({
      include: {
        chef: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.refund.findMany({
      include: {
        payment: {
          include: {
            booking: {
              include: {
                client: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  const totalsByCurrency = new Map<string, { payments: number; payouts: number; refunds: number }>()
  const ensureCurrency = (currency?: string | null) => {
    const code = (currency || "GBP").toUpperCase()
    if (!totalsByCurrency.has(code)) {
      totalsByCurrency.set(code, { payments: 0, payouts: 0, refunds: 0 })
    }
    return totalsByCurrency.get(code)!
  }

  payments.forEach((payment) => {
    ensureCurrency(payment.currency).payments += payment.totalAmount || 0
  })
  payouts.forEach((payout) => {
    ensureCurrency((payout as any).currency).payouts += payout.amount
  })
  refunds.forEach((refund) => {
    ensureCurrency(refund.payment.currency).refunds += refund.amount
  })

  const currencyTotals = Array.from(totalsByCurrency.entries())
    .map(([currency, totals]) => ({
      currency,
      ...totals,
      netRevenue: totals.payments - totals.payouts - totals.refunds,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency))

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Finance Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Currency-separated financial reporting. No FX conversion is applied unless an approved conversion source is configured.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {currencyTotals.length === 0 ? (
          <Card className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10">
            <p className="text-sm font-medium text-muted-foreground">No financial activity recorded yet.</p>
          </Card>
        ) : currencyTotals.map((totals) => (
          <Card key={totals.currency} className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{totals.currency} finance totals</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totals.netRevenue, totals.currency)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Net revenue without FX conversion</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-muted-foreground">Payments</p>
                <p className="font-semibold text-foreground">{formatCurrency(totals.payments, totals.currency)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-muted-foreground">Payouts</p>
                <p className="font-semibold text-foreground">{formatCurrency(totals.payouts, totals.currency)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-muted-foreground">Refunds</p>
                <p className="font-semibold text-foreground">{formatCurrency(totals.refunds, totals.currency)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {ledgerEntries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No ledger entries found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ledgerEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-white/60 bg-muted/30 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full text-xs">
                        {entry.transactionType}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.fromAccount} -&gt; {entry.toAccount}
                    </p>
                  </div>
                  <div className={`text-lg font-semibold ${entry.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {entry.amount > 0 ? "+" : ""}{formatCurrency(Math.abs(entry.amount), entry.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
