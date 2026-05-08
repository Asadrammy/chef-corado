import { geocodeAddress } from "@/lib/geo"
import { chefProfileRepository } from "@/lib/repositories/chef-profile-repository"
import { prisma } from "@/lib/prisma"
import { enforceUserModeration } from "@/lib/security/moderation-guard"
import { validatePolicyFields } from "@/lib/security/communication-policy"

export interface ChefProfileInput {
  phone?: string
  bio?: string
  experience?: number
  location: string
  radius: number
  baseCountryCode?: string
  preferredCurrency?: string
  profileImage?: string
  chefType?: string
  certifications?: string
  eventsPerMonth?: number
  stripeAccountId?: string
  stripeOnboardingComplete?: boolean
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
    insuranceAcknowledgedAt: profile.insuranceAcknowledgedAt,
    insuranceVersion: profile.insuranceVersion,
    baseCountryCode: (profile as any).baseCountryCode,
    preferredCurrency: (profile as any).preferredCurrency,
    chefType: profile.chefType,
    certifications: profile.certifications,
    eventsPerMonth: profile.eventsPerMonth,
    stripeAccountId: profile.stripeAccountId,
    stripeOnboardingComplete: profile.stripeOnboardingComplete,
  }
}

export const chefProfileService = {
  async getByUserId(userId: string) {
    // Verify user exists before fetching profile
    const user = await prisma.user.findUnique({
      where: { id: userId }
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

    validatePolicyFields({
      bio: input.bio,
      location: input.location,
      certifications: input.certifications,
      phone: input.phone,
    })

    const coordinates = await geocodeAddress(input.location)
    const profile = await chefProfileRepository.createForUser(userId, {
      ...input,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    })

    return mapChefProfile(profile)
  },

  async update(userId: string, input: ChefProfileInput) {
    await enforceUserModeration(userId)

    validatePolicyFields({
      bio: input.bio,
      location: input.location,
      certifications: input.certifications,
      phone: input.phone,
    })

    const coordinates = await geocodeAddress(input.location)
    const profile = await chefProfileRepository.updateByUserId(userId, {
      ...input,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    })

    return mapChefProfile(profile)
  },
}
