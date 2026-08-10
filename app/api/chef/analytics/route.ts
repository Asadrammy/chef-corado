import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'CHEF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const chef = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!chef) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 })
    }

    const now = new Date()
    const [bookings, proposals, reviews, payments] = await Promise.all([
      prisma.booking.findMany({
        where: { chefId: chef.id },
        select: { id: true, status: true, eventDate: true, totalPrice: true, createdAt: true },
      }),
      prisma.proposal.findMany({
        where: { chefId: chef.id },
        select: { id: true, status: true, createdAt: true, updatedAt: true },
      }),
      prisma.review.findMany({
        where: { chefId: chef.id },
        select: { rating: true, createdAt: true },
      }),
      prisma.payment.findMany({
        where: {
          booking: { chefId: chef.id },
          status: { in: ['PAID', 'RELEASED'] },
        },
        select: { totalAmount: true, chefAmount: true, commissionAmount: true, currency: true, createdAt: true },
      }),
    ])

    const completedJobs = bookings.filter((booking) => booking.status === 'COMPLETED').length
    const upcomingJobs = bookings.filter((booking) => booking.status !== 'CANCELLED' && booking.eventDate >= now).length
    const acceptedProposals = proposals.filter((proposal) => ['ACCEPTED', 'ACCEPTED_PENDING_PAYMENT', 'BOOKED'].includes(proposal.status)).length
    const rejectedProposals = proposals.filter((proposal) => proposal.status === 'REJECTED').length
    const decidedProposals = acceptedProposals + rejectedProposals
    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null

    const earningsByCurrency = payments.reduce<Record<string, { chefAmount: number; grossAmount: number; commissionAmount: number }>>((acc, payment) => {
      const currency = payment.currency || 'GBP'
      acc[currency] ??= { chefAmount: 0, grossAmount: 0, commissionAmount: 0 }
      acc[currency].chefAmount += payment.chefAmount
      acc[currency].grossAmount += payment.totalAmount
      acc[currency].commissionAmount += payment.commissionAmount
      return acc
    }, {})

    return NextResponse.json({ 
      data: {
        completedJobs,
        upcomingJobs,
        totalBookings: bookings.length,
        totalProposals: proposals.length,
        acceptedProposals,
        rejectedProposals,
        acceptanceRate: proposals.length ? Math.round((acceptedProposals / proposals.length) * 1000) / 10 : null,
        successRate: decidedProposals ? Math.round((acceptedProposals / decidedProposals) * 1000) / 10 : null,
        averageRating: averageRating === null ? null : Math.round(averageRating * 10) / 10,
        reviewCount: reviews.length,
        earningsByCurrency,
        unavailableMetrics: ['responseTime'].filter(Boolean),
      }
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
