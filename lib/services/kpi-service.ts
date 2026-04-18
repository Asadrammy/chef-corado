import { prisma } from "@/lib/prisma"
import { subDays, format, startOfDay, endOfDay } from "date-fns"

export type KpiTrendData = {
  date: string
  quotesSent: number
  proposalsAccepted: number
  proposalsRejected: number
  earnings: number
}

export type KpiTrendResponse = {
  trends: KpiTrendData[]
  summary: {
    totalQuotesSent: number
    totalProposalsAccepted: number
    totalProposalsRejected: number
    totalEarnings: number
    quotesTrend: number // % change vs previous period
    acceptanceRate: number
  }
}

/**
 * Compute KPI trends from existing data (no migration required)
 * This queries proposals and payments directly to build daily trends
 */
export async function computeKpiTrends(chefId: string, days: number = 14): Promise<KpiTrendResponse> {
  const endDate = new Date()
  const startDate = subDays(endDate, days - 1)

  // Get all proposals for this chef in the period
  const proposals = await prisma.proposal.findMany({
    where: {
      chefId,
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Get completed payments for earnings
  const payments = await prisma.payment.findMany({
    where: {
      booking: {
        chefId,
      },
      status: "COMPLETED",
      releasedAt: {
        gte: startDate,
      },
    },
    select: {
      chefAmount: true,
      releasedAt: true,
    },
  })

  // Group by date
  const trends: KpiTrendData[] = []
  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, days - 1 - i)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const quotesSent = proposals.filter(
      (p) => p.createdAt >= dayStart && p.createdAt <= dayEnd
    ).length

    const proposalsAccepted = proposals.filter(
      (p) => p.status === "ACCEPTED" && p.updatedAt >= dayStart && p.updatedAt <= dayEnd
    ).length

    const proposalsRejected = proposals.filter(
      (p) => p.status === "REJECTED" && p.updatedAt >= dayStart && p.updatedAt <= dayEnd
    ).length

    const earnings = payments
      .filter((p) => p.releasedAt && p.releasedAt >= dayStart && p.releasedAt <= dayEnd)
      .reduce((sum, p) => sum + (p.chefAmount || 0), 0)

    trends.push({
      date: format(date, "MMM d"),
      quotesSent,
      proposalsAccepted,
      proposalsRejected,
      earnings,
    })
  }

  // Calculate summary
  const totalQuotesSent = trends.reduce((sum, t) => sum + t.quotesSent, 0)
  const totalProposalsAccepted = trends.reduce((sum, t) => sum + t.proposalsAccepted, 0)
  const totalProposalsRejected = trends.reduce((sum, t) => sum + t.proposalsRejected, 0)
  const totalEarnings = trends.reduce((sum, t) => sum + t.earnings, 0)

  // Calculate quotes trend (compare first half vs second half)
  const midpoint = Math.floor(days / 2)
  const firstHalfQuotes = trends.slice(0, midpoint).reduce((sum, t) => sum + t.quotesSent, 0)
  const secondHalfQuotes = trends.slice(midpoint).reduce((sum, t) => sum + t.quotesSent, 0)
  const quotesTrend =
    firstHalfQuotes > 0
      ? Math.round(((secondHalfQuotes - firstHalfQuotes) / firstHalfQuotes) * 100)
      : secondHalfQuotes > 0
        ? 100
        : 0

  const acceptanceRate = totalQuotesSent > 0
    ? Math.round((totalProposalsAccepted / totalQuotesSent) * 100 * 10) / 10
    : 0

  return {
    trends,
    summary: {
      totalQuotesSent,
      totalProposalsAccepted,
      totalProposalsRejected,
      totalEarnings,
      quotesTrend,
      acceptanceRate,
    },
  }
}
