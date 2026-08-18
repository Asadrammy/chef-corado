import { calculateDistance } from "@/lib/geo"
import { prisma } from "@/lib/prisma"

export interface MatchFactors {
  distance: number
  cuisineFit: number
  budgetFit: number
  availability: number
  quality: number
  responsiveness: number
}

export interface MatchResult {
  requestId: string
  matchScore: number
  matchLabel: "Best Match" | "High Value" | "Fast Available" | "Great Price" | "Good Fit" | "Standard"
  matchReasons: string[]
  estimatedResponseTime: number
  priceEstimate: {
    min: number
    max: number
    confidence: number
  }
  factors: MatchFactors
}

// Algorithm weights (configurable per market)
const MATCH_WEIGHTS = {
  distance: 0.20,
  cuisineFit: 0.20,
  budgetFit: 0.20,
  availability: 0.15,
  quality: 0.15,
  responsiveness: 0.10,
}

// Quality thresholds for match labels
const MATCH_LABEL_THRESHOLDS = {
  bestMatch: 90,
  highValue: 80,
  fastAvailable: 70,
  greatPrice: 60,
  goodFit: 50,
}

interface ChefStats {
  averageRating: number
  reviewCount: number
  completedBookings: number
  responseRate: number
  avgResponseTime: number | null
}

interface RequestData {
  id: string
  budget: number
  eventDate: Date
  requestDates?: Date[]
  serviceType?: string | null
  eventType?: string | null
  cuisineTypes?: string[]
  dietaryRequirements?: string[]
  pricingGuestCount?: number | null
  details?: string | null
  latitude: number | null
  longitude: number | null
}

interface ChefData {
  id: string
  cuisineType?: string | null
  cuisineTypes?: string | null
  specialties?: string | null
  bio?: string | null
  radius: number
  latitude: number | null
  longitude: number | null
  menus: Array<{
    price: number
    cuisineType?: string | null
    eventType?: string | null
  }>
  experiences: Array<{
    price: number
    serviceType?: string | null
    cuisineType?: string | null
    eventType?: string | null
    minGuests?: number | null
    maxGuests?: number | null
  }>
}

export class SmartMatchingService {
  /**
   * Calculate comprehensive match score between a chef and a request
   */
  static async calculateMatchScore(
    request: RequestData,
    chef: ChefData,
    chefStats: ChefStats
  ): Promise<MatchResult> {
    const factors = await this.calculateFactors(request, chef, chefStats)

    const totalScore = Math.round(
      factors.distance * MATCH_WEIGHTS.distance +
      factors.cuisineFit * MATCH_WEIGHTS.cuisineFit +
      factors.budgetFit * MATCH_WEIGHTS.budgetFit +
      factors.availability * MATCH_WEIGHTS.availability +
      factors.quality * MATCH_WEIGHTS.quality +
      factors.responsiveness * MATCH_WEIGHTS.responsiveness
    )

    const matchLabel = this.getMatchLabel(totalScore, factors)
    const matchReasons = this.generateMatchReasons(factors, totalScore)
    const estimatedResponseTime = this.predictResponseTime(chefStats)
    const priceEstimate = this.estimatePriceRange(request, chef)

    return {
      requestId: request.id,
      matchScore: totalScore,
      matchLabel,
      matchReasons,
      estimatedResponseTime,
      priceEstimate,
      factors,
    }
  }

  /**
   * Calculate individual match factors
   */
  private static async calculateFactors(
    request: RequestData,
    chef: ChefData,
    chefStats: ChefStats
  ): Promise<MatchFactors> {
    return {
      distance: this.calculateDistanceScore(request, chef),
      cuisineFit: this.calculateCuisineScore(request, chef),
      budgetFit: this.calculateBudgetScore(request, chef),
      availability: await this.calculateAvailabilityScore(request, chef),
      quality: this.calculateQualityScore(chefStats),
      responsiveness: this.calculateResponsivenessScore(chefStats),
    }
  }

  /**
   * Distance score: 100 = same location, 0 = at radius limit
   */
  private static calculateDistanceScore(
    request: RequestData,
    chef: ChefData
  ): number {
    if (!request.latitude || !request.longitude || !chef.latitude || !chef.longitude) {
      return 50 // Neutral score if coordinates missing
    }

    const distance = calculateDistance(
      request.latitude,
      request.longitude,
      chef.latitude,
      chef.longitude
    )

    // Score decreases linearly from 100 at 0km to 0 at radius limit
    const score = Math.max(0, 100 - (distance / chef.radius) * 100)
    return Math.round(score)
  }

  /**
   * Cuisine fit score based on menu/experience alignment
   */
  private static calculateCuisineScore(
    request: RequestData,
    chef: ChefData
  ): number {
    const requestDetails = (request.details || "").toLowerCase()
    const requestedCuisines = request.cuisineTypes?.map((value) => value.toLowerCase()) ?? []
    const requestedDietary = request.dietaryRequirements?.map((value) => value.toLowerCase()) ?? []
    const chefText = [
      chef.cuisineType,
      chef.cuisineTypes,
      chef.specialties,
      chef.bio,
      ...chef.menus.flatMap((menu) => [menu.cuisineType, menu.eventType]),
      ...chef.experiences.flatMap((experience) => [experience.cuisineType, experience.eventType, experience.serviceType]),
    ].filter(Boolean).join(" ").toLowerCase()
    let score = 50 // Base score

    if (requestedCuisines.length) {
      const matchedCuisines = requestedCuisines.filter((cuisine) => chefText.includes(cuisine))
      score += matchedCuisines.length > 0 ? Math.min(35, matchedCuisines.length * 15) : -10
    } else if (chef.cuisineType && requestDetails.includes(chef.cuisineType.toLowerCase())) {
      score += 20
    }

    if (request.serviceType) {
      const serviceMatch = chef.experiences.some((experience) => experience.serviceType === request.serviceType) ||
        chefText.includes(request.serviceType.toLowerCase().replaceAll("_", " "))
      score += serviceMatch ? 15 : -10
    }

    if (request.eventType) {
      const eventType = request.eventType.toLowerCase()
      score += chef.experiences.some((experience) => experience.eventType?.toLowerCase().includes(eventType)) ||
        chef.menus.some((menu) => menu.eventType?.toLowerCase().includes(eventType))
        ? 10
        : 0
    }

    if (requestedDietary.length) {
      const matchedDietary = requestedDietary.filter((item) => chefText.includes(item))
      score += matchedDietary.length > 0 ? Math.min(10, matchedDietary.length * 5) : 0
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Budget fit score based on chef's pricing alignment
   */
  private static calculateBudgetScore(
    request: RequestData,
    chef: ChefData
  ): number {
    const budget = request.budget

    // Get chef's price range from menus and experiences
    const allPrices = [
      ...chef.menus.map((m) => m.price),
      ...chef.experiences.map((e) => e.price),
    ].filter((p) => p > 0)

    if (allPrices.length === 0) {
      return 50 // Neutral if no pricing data
    }

    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length

    // Perfect fit: budget is within chef's range
    if (budget >= minPrice && budget <= maxPrice * 1.5) {
      return 90 + Math.round((1 - Math.abs(budget - avgPrice) / budget) * 10)
    }

    // Budget is close to range
    if (budget >= minPrice * 0.8 && budget <= maxPrice * 2) {
      return 70
    }

    // Budget is significantly different
    return 40
  }

  /**
   * Availability score based on chef's calendar
   */
  private static async calculateAvailabilityScore(
    request: RequestData,
    chef: ChefData
  ): Promise<number> {
    try {
      const dates = request.requestDates?.length ? request.requestDates : [request.eventDate]
      const scores = []

      for (const date of dates) {
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        const availability = await prisma.availability.findFirst({
          where: {
            chefId: chef.id,
            date: {
              gte: dayStart,
              lt: dayEnd,
            },
            isAvailable: true,
            currentBookings: {
              lt: prisma.availability.fields.maxBookings,
            },
          },
        })

        if (availability) {
          const bookingRatio = availability.currentBookings / availability.maxBookings
          scores.push(Math.round(100 - bookingRatio * 30))
        } else {
          scores.push(50)
        }
      }

      return Math.min(...scores)
    } catch {
      return 50
    }
  }

  /**
   * Quality score based on ratings and reviews
   */
  private static calculateQualityScore(chefStats: ChefStats): number {
    let score = 50 // Base score

    // Rating component (up to 30 points)
    if (chefStats.averageRating > 0) {
      score += Math.round((chefStats.averageRating / 5) * 30)
    }

    // Review count component (up to 10 points)
    if (chefStats.reviewCount >= 20) score += 10
    else if (chefStats.reviewCount >= 10) score += 7
    else if (chefStats.reviewCount >= 5) score += 5
    else if (chefStats.reviewCount > 0) score += 2

    // Completed bookings component (up to 10 points)
    if (chefStats.completedBookings >= 50) score += 10
    else if (chefStats.completedBookings >= 20) score += 7
    else if (chefStats.completedBookings >= 10) score += 5
    else if (chefStats.completedBookings >= 5) score += 3
    else if (chefStats.completedBookings > 0) score += 1

    return Math.min(100, score)
  }

  /**
   * Responsiveness score based on response rate and time
   */
  private static calculateResponsivenessScore(chefStats: ChefStats): number {
    let score = 50 // Base score

    // Response rate component (up to 30 points)
    if (chefStats.responseRate >= 90) score += 30
    else if (chefStats.responseRate >= 80) score += 25
    else if (chefStats.responseRate >= 70) score += 20
    else if (chefStats.responseRate >= 60) score += 15
    else if (chefStats.responseRate >= 50) score += 10
    else if (chefStats.responseRate > 0) score += 5

    // Response time component (up to 20 points)
    if (chefStats.avgResponseTime) {
      if (chefStats.avgResponseTime <= 30) score += 20 // Under 30 min
      else if (chefStats.avgResponseTime <= 60) score += 15 // Under 1 hour
      else if (chefStats.avgResponseTime <= 120) score += 10 // Under 2 hours
      else if (chefStats.avgResponseTime <= 240) score += 5 // Under 4 hours
    }

    return Math.min(100, score)
  }

  /**
   * Determine match label based on score and factors
   */
  private static getMatchLabel(
    totalScore: number,
    factors: MatchFactors
  ): MatchResult["matchLabel"] {
    // Best Match: Top tier with strong all-around performance
    if (
      totalScore >= MATCH_LABEL_THRESHOLDS.bestMatch &&
      factors.distance >= 70 &&
      factors.quality >= 70
    ) {
      return "Best Match"
    }

    // High Value: Good score with excellent budget fit
    if (
      totalScore >= MATCH_LABEL_THRESHOLDS.highValue &&
      factors.budgetFit >= 85
    ) {
      return "High Value"
    }

    // Fast Available: Good availability and responsiveness
    if (
      totalScore >= MATCH_LABEL_THRESHOLDS.fastAvailable &&
      factors.availability >= 85 &&
      factors.responsiveness >= 80
    ) {
      return "Fast Available"
    }

    // Great Price: Excellent budget alignment
    if (totalScore >= MATCH_LABEL_THRESHOLDS.greatPrice && factors.budgetFit >= 90) {
      return "Great Price"
    }

    // Good Fit: Solid overall match
    if (totalScore >= MATCH_LABEL_THRESHOLDS.goodFit) {
      return "Good Fit"
    }

    return "Standard"
  }

  /**
   * Generate human-readable match reasons
   */
  private static generateMatchReasons(
    factors: MatchFactors,
    totalScore: number
  ): string[] {
    const reasons: string[] = []

    if (factors.distance >= 90) {
      reasons.push("Very close to your location")
    } else if (factors.distance >= 70) {
      reasons.push("Within your service area")
    }

    if (factors.cuisineFit >= 80) {
      reasons.push("Perfect cuisine match")
    } else if (factors.cuisineFit >= 60) {
      reasons.push("Good cuisine fit")
    }

    if (factors.budgetFit >= 85) {
      reasons.push("Budget aligns with your pricing")
    }

    if (factors.availability >= 80) {
      reasons.push("Available for the requested date window")
    }

    if (factors.quality >= 80) {
      reasons.push("Highly rated by clients")
    }

    if (factors.responsiveness >= 80) {
      reasons.push("Responds quickly")
    }

    // Add overall assessment if few specific reasons
    if (reasons.length < 2) {
      if (totalScore >= 70) {
        reasons.push("Strong overall match")
      } else {
        reasons.push("Worth considering")
      }
    }

    return reasons.slice(0, 3) // Max 3 reasons
  }

  /**
   * Predict response time based on historical data
   */
  private static predictResponseTime(chefStats: ChefStats): number {
    if (chefStats.avgResponseTime) {
      return Math.round(chefStats.avgResponseTime)
    }

    // Default estimates based on response rate
    if (chefStats.responseRate >= 80) return 30
    if (chefStats.responseRate >= 60) return 60
    if (chefStats.responseRate >= 40) return 120
    return 240
  }

  /**
   * Estimate price range for this request
   */
  private static estimatePriceRange(
    request: RequestData,
    chef: ChefData
  ): MatchResult["priceEstimate"] {
    const allPrices = [
      ...chef.menus.map((m) => m.price),
      ...chef.experiences.map((e) => e.price),
    ].filter((p) => p > 0)

    if (allPrices.length === 0) {
      return {
        min: request.budget * 0.8,
        max: request.budget * 1.2,
        confidence: 0.3,
      }
    }

    const min = Math.min(...allPrices)
    const max = Math.max(...allPrices)
    const avg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length

    // Confidence based on how close budget is to chef's range
    const confidence =
      request.budget >= min && request.budget <= max
        ? 0.9
        : request.budget >= min * 0.8 && request.budget <= max * 1.2
          ? 0.7
          : 0.5

    return {
      min: Math.round(min),
      max: Math.round(max),
      confidence,
    }
  }

  /**
   * Batch calculate matches for multiple requests
   */
  static async batchCalculateMatches(
    requests: RequestData[],
    chefId: string
  ): Promise<MatchResult[]> {
    // Fetch chef data once
    const chef = await prisma.chefProfile.findUnique({
      where: { id: chefId },
      include: {
      menus: { select: { price: true, cuisineType: true, eventType: true } },
      experiences: { select: { price: true, cuisineType: true, eventType: true, serviceType: true, minGuests: true, maxGuests: true } },
        reviews: { select: { rating: true } },
        bookings: { where: { status: "COMPLETED" } },
        proposals: true,
      },
    })

    if (!chef) {
      return requests.map((r) => ({
        requestId: r.id,
        matchScore: 0,
        matchLabel: "Standard",
        matchReasons: ["Chef profile not found"],
        estimatedResponseTime: 240,
        priceEstimate: { min: 0, max: 0, confidence: 0 },
        factors: {
          distance: 0,
          cuisineFit: 0,
          budgetFit: 0,
          availability: 0,
          quality: 0,
          responsiveness: 0,
        },
      }))
    }

    // Calculate chef stats
    const chefStats: ChefStats = {
      averageRating:
        chef.reviews.length > 0
          ? chef.reviews.reduce((sum, r) => sum + r.rating, 0) / chef.reviews.length
          : 0,
      reviewCount: chef.reviews.length,
      completedBookings: chef.bookings.length,
      responseRate: this.calculateResponseRate(chef.proposals),
      avgResponseTime: null, // Would need proposal timestamps
    }

    const chefData: ChefData = {
      id: chef.id,
      cuisineType: chef.cuisineType,
      cuisineTypes: chef.cuisineTypes,
      specialties: chef.specialties,
      bio: chef.bio,
      radius: chef.radius,
      latitude: chef.latitude,
      longitude: chef.longitude,
      menus: chef.menus.filter(m => m.price !== null).map(m => ({ ...m, price: m.price! })),
      experiences: chef.experiences,
    }

    // Calculate matches in parallel
    const matches = await Promise.all(
      requests.map((request) =>
        this.calculateMatchScore(request, chefData, chefStats)
      )
    )

    // Sort by match score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore)
  }

  /**
   * Calculate response rate from proposals
   */
  private static calculateResponseRate(
    proposals: Array<{ status: string }>
  ): number {
    if (proposals.length === 0) return 0

    const responded = proposals.filter((p) =>
      ["ACCEPTED", "DECLINED", "EXPIRED"].includes(p.status)
    ).length

    return Math.round((responded / proposals.length) * 100)
  }
}

export default SmartMatchingService
