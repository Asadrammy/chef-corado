import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, RefreshCw } from "lucide-react"

import { authOptions } from "@/lib/auth"
import { formatCurrency } from "@/lib/currency"
import { generateMeta } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = generateMeta({
  title: "Finance Dashboard",
  description: "View financial transactions and ledger",
})

export default async function AdminFinancePage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

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
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            chef: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.payout.findMany({
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
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
                client: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  const totalPayments = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
  const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0)
  const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0)
  const netRevenue = totalPayments - totalPayouts - totalRefunds

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Finance Dashboard</h1>
            <p className="text-sm text-muted-foreground">View all financial transactions and ledger entries</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalPayments, 'GBP')}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Payouts</p>
              <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalPayouts, 'GBP')}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Refunds</p>
              <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalRefunds, 'GBP')}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <RefreshCw className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Net Revenue</p>
              <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(netRevenue, 'GBP')}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-400">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
        </Card>
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
                  className="flex items-center justify-between p-4 rounded-xl border border-white/60 bg-muted/30 hover:bg-muted/40 transition-colors"
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
                      {entry.fromAccount} → {entry.toAccount}
                    </p>
                  </div>
                  <div className={`text-lg font-semibold ${
                    entry.amount > 0 ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {entry.amount > 0 ? "+" : ""}{formatCurrency(Math.abs(entry.amount), 'GBP')}
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
