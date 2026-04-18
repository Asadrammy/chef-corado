import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { AlertTriangle, CheckCircle, Clock, User, Calendar, MapPin } from "lucide-react"

import { authOptions } from "@/lib/auth"
import { generateMeta } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = generateMeta({
  title: "Dispute Management",
  description: "Manage and resolve disputes",
})

export default async function AdminDisputesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  cookies()

  const disputes = await prisma.dispute.findMany({
    include: {
      booking: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const openDisputes = disputes.filter((d) => d.status === "OPEN")
  const resolvedDisputes = disputes.filter((d) => d.status === "RESOLVED")

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dispute Management</h1>
            <p className="text-sm text-muted-foreground">Review and resolve disputes between clients and chefs</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="rounded-full">
              {openDisputes.length} open
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              {resolvedDisputes.length} resolved
            </Badge>
          </div>
        </div>
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-[30px] border border-white/60 bg-white/72 py-12 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
              <AlertTriangle className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">No disputes found</h2>
            <p className="mt-2 text-sm text-muted-foreground">Disputes will appear here when clients or chefs report issues.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <Card
              key={dispute.id}
              className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        dispute.status === "OPEN" 
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" 
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {dispute.status === "OPEN" ? (
                          <Clock className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{dispute.reason}</h3>
                        <p className="text-sm text-muted-foreground">
                          Initiated by: {dispute.initiatedBy}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={dispute.status === "OPEN" ? "destructive" : "secondary"}
                      className="rounded-full"
                    >
                      {dispute.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{dispute.description}</p>

                  {dispute.booking && (
                    <div className="rounded-xl border border-white/60 bg-muted/30 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                        Booking Details
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">
                            Client: {dispute.booking.client.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">
                            Chef: {dispute.booking.chef.user.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">
                            {format(new Date(dispute.booking.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {dispute.evidence && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Evidence:</span> {dispute.evidence}
                    </div>
                  )}

                  {dispute.status === "RESOLVED" && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Resolution:</span> {dispute.resolution}
                      <br />
                      <span className="font-medium">Resolved by:</span> {dispute.resolvedBy}
                      <br />
                      <span className="font-medium">Resolved at:</span> {dispute.resolvedAt ? format(new Date(dispute.resolvedAt), "MMM d, yyyy 'at' h:mm a") : "N/A"}
                    </div>
                  )}

                  {dispute.status === "OPEN" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-xl">
                        Resolve Dispute
                      </Button>
                    </div>
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
