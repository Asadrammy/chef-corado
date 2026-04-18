/**
 * KPI Tracking Service
 * Records daily KPI snapshots for chef analytics
 * 
 * This service:
 * 1. Records daily KPI snapshots for each chef
 * 2. Retrieves historical KPI data for trends
 * 3. Provides KPI summary calculations
 */

import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay } from "date-fns"

export type KpiSnapshot = {
  date: Date
  quotesSent: number
  proposalsAccepted: number
  proposalsRejected: number
  bookingsCompleted: number
  messageResponseRate: number
  proposalResponseRate: number
  earnings: number
  menusCount: number
}

export type KpiTrend = {
  date: string
  quotesSent: number
  proposalsAccepted: number
  proposalsRejected: number
  earnings: number
}

export type KpiSummary = {
  totalQuotesSent: number
  totalProposalsAccepted: number
  totalProposalsRejected: number
  totalEarnings: number
  quotesTrend: number
  acceptanceRate: number
}

/**
 * Record a KPI snapshot for a specific chef on a specific date
 * If a snapshot already exists for that date, it will be updated
 */
export async function recordKpiSnapshot(chefId: string, date: Date = new Date()): Promise<void> {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  // Get the chef profile to find the userId
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { id: chefId },
    include: {
      user: { select: { id: true } },
      proposals: {
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      },
      bookings: {
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: "COMPLETED",
        },
        include: { payments: true },
      },
      menus: { select: { id: true } },
    },
  })

  if (!chefProfile) {
    throw new Error(`Chef profile not found: ${chefId}`)
  }

  // Calculate metrics for the day
  const quotesSent = chefProfile.proposals.length
  const proposalsAccepted = chefProfile.proposals.filter((p) => p.status === "ACCEPTED").length
  const proposalsRejected = chefProfile.proposals.filter((p) => p.status === "REJECTED").length
  const bookingsCompleted = chefProfile.bookings.filter(
    (b) => b.status === "COMPLETED" && b.payments?.status === "COMPLETED"
  ).length
  const earnings = chefProfile.bookings.reduce((sum, b) => {
    if (b.status === "COMPLETED" && b.payments?.status === "COMPLETED") {
      return sum + (b.payments?.chefAmount || 0)
    }
    return sum
  }, 0)
  const menusCount = chefProfile.menus.length

  // Calculate response rates (simplified - use existing logic from chef-dashboard.ts)
  const messagesToChef = await prisma.message.findMany({
    where: {
      receiverId: chefProfile.userId,
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    select: { id: true, senderId: true, createdAt: true },
  })

  const messagesFromChef = await prisma.message.findMany({
    where: {
      senderId: chefProfile.userId,
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    select: { id: true, receiverId: true, createdAt: true },
  })

  // Calculate message response rate for the day
  let messageResponseRate = 0
  if (messagesToChef.length > 0) {
    const respondedMessages = messagesToChef.filter((msg) => {
      return messagesFromChef.some(
        (reply) =>
          reply.receiverId === msg.senderId &&
          reply.createdAt > msg.createdAt
      )
    })
    messageResponseRate = (respondedMessages.length / messagesToChef.length) * 100
  }

  // Calculate proposal response rate (proposals sent / requests in radius)
  const requestsInRadius = await prisma.request.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    select: {
      latitude: true,
      longitude: true,
      proposals: { where: { chefId } },
    },
  })

  let proposalResponseRate = 0
  if (chefProfile.latitude && chefProfile.longitude) {
    const { calculateDistance } = await import("@/lib/geo")
    const nearbyRequests = requestsInRadius.filter((r) => {
      if (!r.latitude || !r.longitude) return false
      const distance = calculateDistance(
        chefProfile.latitude!,
        chefProfile.longitude!,
        r.latitude,
        r.longitude
      )
      return distance <= chefProfile.radius
    })
    const proposalsSent = nearbyRequests.filter((r) => r.proposals.length > 0).length
    proposalResponseRate = nearbyRequests.length > 0 ? (proposalsSent / nearbyRequests.length) * 100 : 0
  }

  // Upsert the snapshot
  await (prisma as any).chefKpiSnapshot.upsert({
    where: {
      chefId_date: {
        chefId,
        date: dayStart,
      },
    },
    create: {
      chefId,
      date: dayStart,
      quotesSent,
      proposalsAccepted,
      proposalsRejected,
      bookingsCompleted,
      messageResponseRate,
      proposalResponseRate,
      earnings,
      menusCount,
    },
    update: {
      quotesSent,
      proposalsAccepted,
      proposalsRejected,
      bookingsCompleted,
      messageResponseRate,
      proposalResponseRate,
      earnings,
      menusCount,
    },
  })

  console.log(`[KPI] Recorded snapshot for chef ${chefId} on ${dayStart.toISOString().split('T')[0]}`)
}

/**
 * Record KPI snapshots for all active chefs
 * This should be called by a cron job at the end of each day
 */
export async function recordAllChefsKpiSnapshots(): Promise<{ success: number; failed: number }> {
  const activeChefs = await prisma.chefProfile.findMany({
    where: {
      isApproved: true,
      isBanned: false,
    },
    select: { id: true },
  })

  let success = 0
  let failed = 0

  for (const chef of activeChefs) {
    try {
      await recordKpiSnapshot(chef.id)
      success++
    } catch (error) {
      console.error(`[KPI] Failed to record snapshot for chef ${chef.id}:`, error)
      failed++
    }
  }

  console.log(`[KPI] Recorded snapshots for ${success} chefs, ${failed} failed`)
  return { success, failed }
}

/**
 * Get historical KPI trends for a chef
 * Returns data for the last N days
 */
export async function getKpiTrends(
  chefId: string,
  days: number = 14
): Promise<KpiTrend[]> {
  const startDate = subDays(new Date(), days - 1)
  const dayStart = startOfDay(startDate)

  const snapshots = await (prisma as any).chefKpiSnapshot.findMany({
    where: {
      chefId,
      date: { gte: dayStart },
    },
    orderBy: { date: "asc" },
  })

  // Type the results
  type SnapshotRecord = {
    date: Date
    quotesSent: number
    proposalsAccepted: number
    proposalsRejected: number
    earnings: number
  }

  // Create a map of dates to snapshots
  const snapshotMap = new Map<string, SnapshotRecord>(
    (snapshots as SnapshotRecord[]).map((s) => [s.date.toISOString().split('T')[0], s])
  )

  // Generate trends for all days in the range, filling gaps with zeros
  const trends: KpiTrend[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(dayStart)
    date.setDate(date.getDate() + i)
    const dateKey = date.toISOString().split('T')[0]
    const snapshot = snapshotMap.get(dateKey)

    trends.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      quotesSent: snapshot?.quotesSent ?? 0,
      proposalsAccepted: snapshot?.proposalsAccepted ?? 0,
      proposalsRejected: snapshot?.proposalsRejected ?? 0,
      earnings: snapshot?.earnings ?? 0,
    })
  }

  return trends
}

/**
 * Get KPI summary for a chef
 * Returns aggregated metrics for the last N days
 */
export async function getKpiSummary(
  chefId: string,
  days: number = 7
): Promise<KpiSummary> {
  const startDate = subDays(new Date(), days)
  const dayStart = startOfDay(startDate)

  const snapshots = await (prisma as any).chefKpiSnapshot.findMany({
    where: {
      chefId,
      date: { gte: dayStart },
    },
  })

  type SnapshotData = {
    quotesSent: number
    proposalsAccepted: number
    proposalsRejected: number
    earnings: number
  }

  const typedSnapshots = snapshots as SnapshotData[]

  const totalQuotesSent = typedSnapshots.reduce((sum: number, s: SnapshotData) => sum + s.quotesSent, 0)
  const totalProposalsAccepted = typedSnapshots.reduce((sum: number, s: SnapshotData) => sum + s.proposalsAccepted, 0)
  const totalProposalsRejected = typedSnapshots.reduce((sum: number, s: SnapshotData) => sum + s.proposalsRejected, 0)
  const totalEarnings = typedSnapshots.reduce((sum: number, s: SnapshotData) => sum + s.earnings, 0)

  // Calculate trend (compare last 7 days to previous 7 days)
  const previousStartDate = subDays(startDate, days)
  const previousSnapshots = await (prisma as any).chefKpiSnapshot.findMany({
    where: {
      chefId,
      date: { gte: previousStartDate, lt: dayStart },
    },
  }) as SnapshotData[]

  const previousQuotesSent = previousSnapshots.reduce((sum: number, s: SnapshotData) => sum + s.quotesSent, 0)
  const quotesTrend = previousQuotesSent > 0
    ? Math.round(((totalQuotesSent - previousQuotesSent) / previousQuotesSent) * 100)
    : totalQuotesSent > 0 ? 100 : 0

  const acceptanceRate = totalQuotesSent > 0
    ? Math.round((totalProposalsAccepted / totalQuotesSent) * 100 * 10) / 10
    : 0

  return {
    totalQuotesSent,
    totalProposalsAccepted,
    totalProposalsRejected,
    totalEarnings,
    quotesTrend,
    acceptanceRate,
  }
}

/**
 * Get or create today's KPI snapshot for a chef
 * Useful for real-time updates
 */
export async function getTodayKpiSnapshot(chefId: string): Promise<KpiSnapshot> {
  const today = startOfDay(new Date())
  
  // Try to get existing snapshot
  const existing = await (prisma as any).chefKpiSnapshot.findUnique({
    where: {
      chefId_date: {
        chefId,
        date: today,
      },
    },
  })

  if (existing) {
    return {
      date: existing.date,
      quotesSent: existing.quotesSent,
      proposalsAccepted: existing.proposalsAccepted,
      proposalsRejected: existing.proposalsRejected,
      bookingsCompleted: existing.bookingsCompleted,
      messageResponseRate: existing.messageResponseRate,
      proposalResponseRate: existing.proposalResponseRate,
      earnings: existing.earnings,
      menusCount: existing.menusCount,
    }
  }

  // Record a new snapshot
  await recordKpiSnapshot(chefId)
  
  // Return the newly created snapshot
  const snapshot = await (prisma as any).chefKpiSnapshot.findUnique({
    where: {
      chefId_date: {
        chefId,
        date: today,
      },
    },
  })

  return {
    date: snapshot?.date ?? today,
    quotesSent: snapshot?.quotesSent ?? 0,
    proposalsAccepted: snapshot?.proposalsAccepted ?? 0,
    proposalsRejected: snapshot?.proposalsRejected ?? 0,
    bookingsCompleted: snapshot?.bookingsCompleted ?? 0,
    messageResponseRate: snapshot?.messageResponseRate ?? 0,
    proposalResponseRate: snapshot?.proposalResponseRate ?? 0,
    earnings: snapshot?.earnings ?? 0,
    menusCount: snapshot?.menusCount ?? 0,
  }
}
