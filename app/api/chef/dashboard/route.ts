import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get chef profile
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    }

    // Fetch all data in parallel for optimal performance
    const [
      requests,
      proposals,
      bookings,
      experiences,
      completedBookings,
      reviews,
      earningsData
    ] = await Promise.all([
      // Available requests (filtered by chef radius)
      prisma.request.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
          eventDate: { gte: new Date() }
        },
        orderBy: { eventDate: "desc" },
        take: 100
      }),
      
      // Chef's proposals
      prisma.proposal.findMany({
        where: { chefId: chefProfile.id },
        include: { request: true }
      }),
      
      // Chef's bookings
      prisma.booking.findMany({
        where: { chefId: chefProfile.id },
        include: {
          payments: true,
          client: true
        },
        orderBy: { createdAt: "desc" }
      }),
      
      // Chef's experiences
      prisma.experience.findMany({
        where: { chefId: chefProfile.id, isActive: true }
      }),
      
      // Completed bookings for earnings
      prisma.booking.findMany({
        where: {
          chefId: chefProfile.id,
          status: 'COMPLETED',
          payments: {
            status: 'COMPLETED'
          }
        },
        include: {
          payments: {
            where: {
              status: 'COMPLETED'
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }),
      
      // Reviews for rating calculation
      prisma.review.findMany({
        where: { chefId: chefProfile.id },
        include: { client: { select: { name: true } } }
      }),
      
      // Earnings data by month
      prisma.booking.findMany({
        where: {
          chefId: chefProfile.id,
          status: 'COMPLETED',
          payments: {
            status: 'COMPLETED'
          }
        },
        include: {
          payments: {
            where: {
              status: 'COMPLETED'
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    ])

    // Filter requests by chef's service radius
    const availableRequests = requests.filter(request => {
      if (!chefProfile.latitude || !chefProfile.longitude || !request.latitude || !request.longitude) {
        return false
      }
      
      // Simple distance calculation in degrees (rough approximation)
      const distance = Math.sqrt(
        Math.pow(request.latitude - chefProfile.latitude, 2) + 
        Math.pow(request.longitude - chefProfile.longitude, 2)
      )
      
      // Convert to approximate miles (1 degree ≈ 69 miles)
      const distanceInMiles = distance * 69
      
      return distanceInMiles <= chefProfile.radius
    })

    // Calculate metrics
    const activeBookings = bookings.filter(b => b.status !== "CANCELLED").length
    const completedBookingsCount = bookings.filter(b => b.status === "COMPLETED").length
    
    // Calculate total earnings (chef's share after commission)
    const totalEarnings = completedBookings.reduce((sum, booking) => {
      if (booking.payments) {
        return sum + (booking.payments.chefAmount || 0)
      }
      return sum
    }, 0)

    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0

    // Calculate profile completion
    const profileCompletion = {
      hasProfile: true,
      hasBio: !!chefProfile.bio,
      hasExperience: !!chefProfile.experience,
      hasLocation: !!chefProfile.location,
      hasExperiences: experiences.length > 0,
      hasAvailability: true, // Would need to check availability table
      hasCuisineType: !!chefProfile.cuisineType,
      hasProfileImage: !!chefProfile.profileImage
    }
    
    const completionPercentage = Math.round(
      (Object.values(profileCompletion).filter(Boolean).length / Object.keys(profileCompletion).length) * 100
    )

    // Process earnings data by month (for existing functionality)
    const earningsByMonth = new Map<string, number>()
    
    earningsData.forEach(booking => {
      const month = booking.createdAt.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      })
      
      const bookingEarnings = booking.payments ? 
        (booking.payments.chefAmount || 0) : 0

      const currentEarnings = earningsByMonth.get(month) || 0
      earningsByMonth.set(month, currentEarnings + bookingEarnings)
    })

    const processedEarningsData = Array.from(earningsByMonth.entries())
      .map(([month, earnings]) => ({
        month: month.split(' ')[0],
        earnings: Math.round(earnings * 100) / 100
      }))
      .sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
      })

    // Process earnings trend data by day (for chart visualization)
    const earningsTrend = new Map<string, number>()
    
    // Get the last 30 days of data
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Initialize all days with 0 earnings
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
      const dateKey = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
      earningsTrend.set(dateKey, 0)
    }
    
    // Add actual earnings from completed bookings
    completedBookings.forEach(booking => {
      if (booking.createdAt >= thirtyDaysAgo) {
        const dateKey = booking.createdAt.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
        
        const bookingEarnings = booking.payments ? 
          (booking.payments.chefAmount || 0) : 0

        const currentEarnings = earningsTrend.get(dateKey) || 0
        earningsTrend.set(dateKey, currentEarnings + bookingEarnings)
      }
    })

    // Convert to array and sort by date
    const processedEarningsTrend = Array.from(earningsTrend.entries())
      .map(([date, earnings]) => ({
        date,
        earnings: Math.round(earnings * 100) / 100
      }))
      .slice(-14) // Show last 14 days for better visualization

    return NextResponse.json({
      // Metrics
      totalEarnings,
      activeBookings,
      availableRequests: availableRequests.length,
      completedBookings: completedBookingsCount,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      
      // Profile data
      profile: chefProfile,
      profileCompletion: completionPercentage,
      approvalStatus: chefProfile.isApproved ? "Approved" : "Pending",
      
      // Data for components
      requests: availableRequests,
      proposals,
      bookings,
      experiences,
      reviews,
      earningsData: processedEarningsData,
      earningsTrend: processedEarningsTrend
    })

  } catch (error) {
    console.error('Chef dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
