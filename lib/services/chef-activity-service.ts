import { prisma } from "@/lib/prisma"

export const chefActivityService = {
  async getActivityStatus(chefId: string) {
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: chefId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        proposals: {
          select: {
            id: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        bookings: {
          select: {
            id: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    })

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const recentActivities = [
      ...chefProfile.proposals.map((p) => p.createdAt),
      ...chefProfile.bookings.map((b) => b.createdAt),
    ].sort((a, b) => b.getTime() - a.getTime())

    const lastActivity = recentActivities[0] ?? null
    const isActive = lastActivity ? lastActivity > oneHourAgo : false

    const responseTimes = await prisma.$queryRaw`
      SELECT 
        AVG(
          (julianday(p.createdAt) - julianday(r.createdAt)) * 24 * 60
        ) as avgResponseMinutes
      FROM Request r
      JOIN Proposal p ON r.id = p.requestId
      WHERE p.chefId = ${chefId}
      AND r.createdAt >= ${oneWeekAgo.toISOString()}
    `

    const avgResponseTime =
      Array.isArray(responseTimes) && responseTimes[0]?.avgResponseMinutes
        ? Math.round(Number(responseTimes[0].avgResponseMinutes))
        : null

    return {
      isActive,
      lastSeen: lastActivity ? lastActivity.toISOString() : null,
      avgResponseTime,
    }
  },
}
