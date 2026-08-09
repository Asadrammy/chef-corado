import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/currency"

export async function countByCurrency() {
  const rows = await prisma.payment.groupBy({
    by: ["currency"],
    _sum: {
      totalAmount: true,
      commissionAmount: true,
      chefAmount: true,
    },
    _count: { _all: true },
    orderBy: { currency: "asc" },
  })

  return rows.map((row) => ({
    currency: row.currency,
    total: row._sum.totalAmount ?? 0,
    commission: row._sum.commissionAmount ?? 0,
    chefAmount: row._sum.chefAmount ?? 0,
    count: row._count._all,
    label: `${row.currency}: ${formatCurrency(row._sum.totalAmount ?? 0, row.currency)}`,
  }))
}

export async function getRecentRequests(where?: Record<string, unknown>) {
  return prisma.request.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      title: true,
      requestMode: true,
      serviceTypeLabel: true,
      eventType: true,
      eventDate: true,
      currency: true,
      budget: true,
      location: true,
      client: { select: { name: true, email: true } },
    },
  })
}

export async function getRecentBookings(where?: Record<string, unknown>) {
  return prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      status: true,
      bookingType: true,
      serviceTypeLabel: true,
      eventDate: true,
      totalPrice: true,
      currency: true,
      client: { select: { name: true, email: true } },
      chef: { select: { user: { select: { name: true, email: true } } } },
    },
  })
}

export async function getSupportTicketSummary() {
  const [open, resolved, urgent, recent] = await Promise.all([
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"] } } }),
    prisma.supportTicket.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
    prisma.supportTicket.count({ where: { priority: { in: ["HIGH", "URGENT"] }, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ])

  return { open, resolved, urgent, recent }
}

export async function getFullTimeSummary() {
  const [open, resolved, recent] = await Promise.all([
    prisma.fullTimeChefEnquiry.count({ where: { status: { notIn: ["CLOSED", "RESOLVED", "PLACED", "LOST"] } } }),
    prisma.fullTimeChefEnquiry.count({ where: { status: { in: ["CLOSED", "RESOLVED", "PLACED", "LOST"] } } }),
    prisma.fullTimeChefEnquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        location: true,
        countryCode: true,
        placementType: true,
        liveInPreference: true,
        status: true,
        desiredStartDate: true,
        budgetAmount: true,
        currency: true,
        client: { select: { name: true, email: true } },
      },
    }),
  ])

  return { open, resolved, recent }
}

export async function getAssetSummary() {
  const [total, approved, reviewRequired, recent] = await Promise.all([
    prisma.serviceAsset.count(),
    prisma.serviceAsset.count({ where: { clientApproved: true } }),
    prisma.serviceAsset.count({ where: { status: "REVIEW_REQUIRED" } }),
    prisma.serviceAsset.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ])

  return { total, approved, reviewRequired, recent }
}
