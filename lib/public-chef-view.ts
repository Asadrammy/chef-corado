import { normalizeCurrency } from "@/lib/currency"
import { decodeChefSpecialties } from "@/lib/chef-onboarding-options"

export const PUBLIC_COMPLETED_BOOKING_STATUSES = ["COMPLETED"] as const

export const publicChefEligibilityWhere = {
  isApproved: true,
  verificationStatus: "APPROVED",
  isBanned: false,
  user: {
    role: "CHEF",
    isBanned: false,
  },
} as const

export type PublicChefMenuDTO = {
  id: string
  title: string
  description?: string | null
  price?: number | null
  currency?: string | null
  menuImage?: string | null
  cuisineType?: string | null
  eventType?: string | null
  menuType?: string | null
}

export type PublicChefExperienceDTO = {
  id: string
  title: string
  description?: string | null
  price?: number | null
  currency?: string | null
  duration?: number | null
  eventType?: string | null
  cuisineType?: string | null
  minGuests?: number | null
  maxGuests?: number | null
  serviceType?: string | null
  offersCookingClasses?: boolean | null
  classType?: string | null
  pricePerStudent?: number | null
}

export type PublicChefDTO = {
  id: string
  displayName: string
  bio?: string | null
  experience?: number | null
  location?: string | null
  radius?: number | null
  profileImage?: string | null
  chefType?: string | null
  specialties: string[]
  cuisineType?: string | null
  cuisines: string[]
  averageRating: number
  reviewCount: number
  completedJobs: number
  publicMinimumSpend?: number | null
  publicMinimumSpendCurrency?: string | null
  distance?: number | null
  createdAt?: string | null
  approvedAt?: string | null
  user: {
    id: string
    name: string
  }
  menus: PublicChefMenuDTO[]
  experiences: PublicChefExperienceDTO[]
  reviews?: Array<{
    id: string
    rating: number
    comment?: string | null
    createdAt: string
    client: {
      name: string
    }
  }>
}

export function getChefDisplayName(profile: any) {
  const firstSurname = [profile.user?.firstName, profile.user?.surname].filter(Boolean).join(" ").trim()
  return firstSurname || profile.user?.name || "ChefaChef chef"
}

export function getCompletedJobsCount(profile: any) {
  const filteredCount = profile._count?.completedBookings
  if (typeof filteredCount === "number") return filteredCount

  const bookingCount = profile._count?.bookings
  if (typeof bookingCount === "number" && profile._count?.bookingsFilteredToCompleted === true) return bookingCount

  if (Array.isArray(profile.bookings)) {
    return profile.bookings.filter((booking: any) => PUBLIC_COMPLETED_BOOKING_STATUSES.includes(booking.status)).length
  }

  return 0
}

export function getAverageRating(profile: any) {
  const reviews = Array.isArray(profile.reviews) ? profile.reviews : []
  if (!reviews.length) return 0
  const totalRatings = reviews.reduce((sum: number, review: { rating?: number | null }) => sum + Number(review.rating ?? 0), 0)
  return Number((totalRatings / reviews.length).toFixed(1))
}

export function getCuisineLabels(profile: any) {
  const values = [
    profile.cuisineType,
    profile.cuisineTypes,
    ...(profile.menus ?? []).flatMap((menu: any) => [menu.cuisineType, menu.eventType]),
    ...(profile.experiences ?? []).flatMap((experience: any) => [experience.cuisineType, experience.eventType]),
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean)

  return Array.from(new Set(values))
}

export function serializePublicChef(profile: any, options: {
  publicMinimumSpend?: number | null
  publicMinimumSpendCurrency?: string | null
  distance?: number | null
  includeReviews?: boolean
} = {}): PublicChefDTO {
  const displayName = getChefDisplayName(profile)
  const averageRating = getAverageRating(profile)
  const reviewCount = typeof profile._count?.reviews === "number"
    ? profile._count.reviews
    : Array.isArray(profile.reviews)
      ? profile.reviews.length
      : 0

  const menus: PublicChefMenuDTO[] = (profile.menus ?? []).map((menu: any) => ({
    id: menu.id,
    title: menu.title,
    description: menu.description ?? null,
    price: menu.price ?? null,
    currency: menu.currency ?? normalizeCurrency(profile.preferredCurrency ?? "GBP"),
    menuImage: menu.menuImage ?? null,
    cuisineType: menu.cuisineType ?? null,
    eventType: menu.eventType ?? null,
    menuType: menu.menuType ?? null,
  }))

  const experiences: PublicChefExperienceDTO[] = (profile.experiences ?? []).map((experience: any) => ({
    id: experience.id,
    title: experience.title,
    description: experience.description ?? null,
    price: experience.price ?? null,
    currency: experience.currency ?? normalizeCurrency(profile.preferredCurrency ?? "GBP"),
    duration: experience.duration ?? null,
    eventType: experience.eventType ?? null,
    cuisineType: experience.cuisineType ?? null,
    minGuests: experience.minGuests ?? null,
    maxGuests: experience.maxGuests ?? null,
    serviceType: experience.serviceType ?? null,
    offersCookingClasses: experience.offersCookingClasses ?? null,
    classType: experience.classType ?? null,
    pricePerStudent: experience.pricePerStudent ?? null,
  }))

  return {
    id: profile.id,
    displayName,
    bio: profile.bio ?? null,
    experience: profile.experience ?? null,
    location: profile.location ?? null,
    radius: profile.radius ?? null,
    profileImage: profile.profileImage ?? null,
    chefType: profile.chefType ?? null,
    specialties: decodeChefSpecialties(profile.specialties, profile.chefType),
    cuisineType: profile.cuisineType ?? null,
    cuisines: getCuisineLabels({ ...profile, menus, experiences }),
    averageRating,
    reviewCount,
    completedJobs: getCompletedJobsCount(profile),
    publicMinimumSpend: options.publicMinimumSpend ?? null,
    publicMinimumSpendCurrency: options.publicMinimumSpendCurrency ?? normalizeCurrency(profile.preferredCurrency ?? "GBP"),
    distance: options.distance ?? profile.distance ?? null,
    createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt ?? null,
    approvedAt: profile.approvedAt instanceof Date ? profile.approvedAt.toISOString() : profile.approvedAt ?? null,
    user: {
      id: profile.user?.id,
      name: displayName,
    },
    menus,
    experiences,
    reviews: options.includeReviews
      ? (profile.reviews ?? []).map((review: any) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment ?? null,
          createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : String(review.createdAt),
          client: {
            name: review.client?.name ?? "Anonymous",
          },
        }))
      : undefined,
  }
}

export function pluralizeCompletedJobs(count: number) {
  return `${count} completed ChefaChef ${count === 1 ? "job" : "jobs"}`
}
