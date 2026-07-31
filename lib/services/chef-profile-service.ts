import { geocodeAddress } from "@/lib/geo"
import { chefProfileRepository } from "@/lib/repositories/chef-profile-repository"
import { prisma } from "@/lib/prisma"
import { enforceUserModeration } from "@/lib/security/moderation-guard"
import { validatePolicyFields } from "@/lib/security/communication-policy"

export interface ChefProfileInput {
  phone?: string
  firstName?: string
  surname?: string
  bio?: string
  experience?: number
  location: string
  radius: number
  baseCountryCode?: string
  preferredCurrency?: string
  profileImage?: string
  chefType?: string
  certifications?: string
  cuisineType?: string
  eventsPerMonth?: number
  stripeAccountId?: string
  stripeOnboardingComplete?: boolean
  rightToWorkUkConfirmed?: boolean
  foodHygieneLevel2Confirmed?: boolean
  foodHygieneCertificateUrl?: string
}

function mapChefProfile(profile: Awaited<ReturnType<typeof chefProfileRepository.findByUserId>>) {
  if (!profile) {
    return null
  }

  const totalRatings = profile.reviews.reduce((sum, review) => sum + review.rating, 0)
  const avgRating = profile.reviews.length > 0 ? totalRatings / profile.reviews.length : 0

  return {
    ...profile,
    avgRating,
    phone: profile.user.phone,
    termsAcceptedAt: profile.user.termsAcceptedAt,
    termsVersion: profile.user.termsVersion,
    acceptedVia: (profile.user as any).acceptedVia ?? null,
    baseCountryCode: (profile as any).baseCountryCode,
    preferredCurrency: (profile as any).preferredCurrency,
    chefType: profile.chefType,
    certifications: profile.certifications,
    cuisineType: (profile as any).cuisineType,
    eventsPerMonth: profile.eventsPerMonth,
    stripeAccountId: profile.stripeAccountId,
    stripeOnboardingComplete: profile.stripeOnboardingComplete,
    rightToWorkUkConfirmed: (profile as any).rightToWorkUkConfirmed ?? false,
    foodHygieneLevel2Confirmed: (profile as any).foodHygieneLevel2Confirmed ?? false,
    foodHygieneCertificateUrl: (profile as any).foodHygieneCertificateUrl ?? undefined,
    foodHygieneCertificateUploadedAt: (profile as any).foodHygieneCertificateUploadedAt ?? null,
    foodHygieneCertificateReviewedAt: (profile as any).foodHygieneCertificateReviewedAt ?? null,
    foodHygieneCertificateReviewedBy: (profile as any).foodHygieneCertificateReviewedBy ?? null,
    foodHygieneCertificateReviewStatus: (profile as any).foodHygieneCertificateReviewStatus ?? null,
    verificationStatus: (profile as any).verificationStatus ?? "PENDING",
    approvedAt: (profile as any).approvedAt ?? null,
    approvedBy: (profile as any).approvedBy ?? null,
  }
}

export const chefProfileService = {
  async getByUserId(userId: string) {
    // Verify user exists before fetching profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      throw new Error("USER_NOT_FOUND")
    }

    const profile = await chefProfileRepository.findByUserId(userId)
    return mapChefProfile(profile)
  },

  async create(userId: string, input: ChefProfileInput) {
    // Verify user exists before creating profile
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error("USER_NOT_FOUND")
    }

    await enforceUserModeration(userId)

    // Don't validate phone numbers in profile fields - they're allowed for contact info
    validatePolicyFields({
      bio: input.bio,
      location: input.location,
      certifications: input.certifications,
    })

    const coordinates = await geocodeAddress(input.location, input.baseCountryCode)
    await chefProfileRepository.createForUser(userId, {
      ...input,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      locationCity: coordinates?.city ?? null,
      locationRegion: coordinates?.region ?? null,
      formattedAddress: coordinates?.formattedAddress ?? null,
      geocodingProvider: coordinates?.provider ?? null,
      geocodingStatus: coordinates ? "VERIFIED" : "UNAVAILABLE",
    })

    const profile = await chefProfileRepository.findByUserId(userId)

    return mapChefProfile(profile)
  },

  async update(userId: string, input: ChefProfileInput) {
    await enforceUserModeration(userId)

    // Don't validate phone numbers in profile fields - they're allowed for contact info
    validatePolicyFields({
      bio: input.bio,
      location: input.location,
      certifications: input.certifications,
    })

    const coordinates = await geocodeAddress(input.location, input.baseCountryCode)
    await chefProfileRepository.updateByUserId(userId, {
      ...input,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      locationCity: coordinates?.city ?? null,
      locationRegion: coordinates?.region ?? null,
      formattedAddress: coordinates?.formattedAddress ?? null,
      geocodingProvider: coordinates?.provider ?? null,
      geocodingStatus: coordinates ? "VERIFIED" : "UNAVAILABLE",
    })

    const profile = await chefProfileRepository.findByUserId(userId)

    return mapChefProfile(profile)
  },
}
