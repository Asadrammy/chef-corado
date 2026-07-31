import { Metadata } from "next"
import type { Notification } from "@prisma/client"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { Bell, Check, Trash2, Filter } from "lucide-react"

import { authOptions } from "@/lib/auth"
import { generateMeta } from "@/lib/utils"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = generateMeta({
  title: "Notifications",
  description: "View and manage your notifications",
})

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    redirect("/dashboard")
  }

  cookies()

  let notifications: Notification[]

  try {
    notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      notifications = []
    } else {
      throw error
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">View and manage your notifications</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full">
              {notifications.filter(n => !n.isRead).length} unread
            </Badge>
          </div>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-[30px] border border-white/60 bg-white/72 py-12 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
              <Bell className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">No notifications yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">You&apos;ll see notifications here when there&apos;s activity on your account.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`rounded-[26px] border ${!notification.isRead ? 'border-primary/20 bg-primary/5' : 'border-white/60 bg-card/95'} p-6 shadow-lg shadow-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${!notification.isRead ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground'}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{notification.type}</span>
                      {!notification.isRead && (
                        <Badge variant="default" className="rounded-full px-2 py-0.5 text-xs">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
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
