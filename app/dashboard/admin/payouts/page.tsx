import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { Wallet, CheckCircle, Clock, User } from "lucide-react"

import { authOptions } from "@/lib/auth"
import { formatCurrency } from "@/lib/currency"
import { generateMeta } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = generateMeta({
  title: "Payout Management",
  description: "Manage chef payouts",
})

export default async function AdminPayoutsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  cookies()

  const payouts = await prisma.payout.findMany({
    include: {
      chef: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const pendingPayouts = payouts.filter((p) => p.status === "PENDING")
  const completedPayouts = payouts.filter((p) => p.status === "COMPLETED")
  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0)
  const totalCompletedAmount = completedPayouts.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="brand-surface rounded-[30px] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Payout Management</h1>
            <p className="text-sm text-muted-foreground">Track and manage chef payouts</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full">
              {pendingPayouts.length} pending
            </Badge>
            <Badge variant="default" className="rounded-full">
              {completedPayouts.length} completed
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Payouts</p>
              <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalPendingAmount)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed Payouts</p>
              <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalCompletedAmount)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {payouts.length === 0 ? (
        <div className="rounded-[30px] border border-white/60 bg-white/72 py-12 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
              <Wallet className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">No payouts found</h2>
            <p className="mt-2 text-sm text-muted-foreground">Payouts will appear here when chefs receive payments.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <Card
              key={payout.id}
              className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {formatCurrency(payout.amount)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Chef: {payout.chef.user.name}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={payout.status === "COMPLETED" ? "default" : "secondary"}
                      className="rounded-full"
                    >
                      {payout.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="text-foreground">{payout.chef.user.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="text-foreground">
                        {format(new Date(payout.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    {payout.processedAt && (
                      <div>
                        <p className="text-muted-foreground">Processed</p>
                        <p className="text-foreground">
                          {format(new Date(payout.processedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    )}
                    {payout.stripeTransferId && (
                      <div>
                        <p className="text-muted-foreground">Transfer ID</p>
                        <p className="text-foreground font-mono text-xs">
                          {payout.stripeTransferId}
                        </p>
                      </div>
                    )}
                  </div>

                  {payout.status === "PENDING" && (
                    <Button size="sm" className="rounded-xl">
                      Process Payout
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
