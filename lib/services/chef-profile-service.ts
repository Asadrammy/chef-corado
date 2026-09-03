import { geocodeAddress } from "@/lib/geo"
import { chefProfileRepository } from "@/lib/repositories/chef-profile-repository"
import { prisma } from "@/lib/prisma"
import { enforceUserModeration } from "@/lib/security/moderation-guard"
import { validatePolicyFields } from "@/lib/security/communication-policy"
import {
  decodeChefSpecialties,
  encodeChefSpecialties,
  normalizeChefCareerStage,
} from "@/lib/chef-onboarding-options"

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
  careerStage?: string
  specialties?: string[]
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
  const legacyNameParts = profile.user.name.trim().split(/\s+/)
  const firstName = profile.user.firstName ?? legacyNameParts[0] ?? ""
  const surname = profile.user.surname ?? legacyNameParts.slice(1).join(" ") ?? ""
  const careerStage = normalizeChefCareerStage((profile as any).careerStage, profile.chefType)
  const specialties = decodeChefSpecialties((profile as any).specialties, profile.chefType)

  return {
    ...profile,
    avgRating,
    phone: profile.user.phone,
    firstName,
    surname,
    termsAcceptedAt: profile.user.termsAcceptedAt,
    termsVersion: profile.user.termsVersion,
    acceptedVia: (profile.user as any).acceptedVia ?? null,
    baseCountryCode: (profile as any).baseCountryCode,
    preferredCurrency: (profile as any).preferredCurrency,
    chefType: profile.chefType,
    careerStage,
    specialties,
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
    reviewedAt: (profile as any).reviewedAt ?? null,
    reviewedBy: (profile as any).reviewedBy ?? null,
    reviewNotes: (profile as any).reviewNotes ?? null,
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
      careerStage: normalizeChefCareerStage(input.careerStage, input.chefType) ?? null,
      specialties: encodeChefSpecialties(input.specialties),
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      locationCity: coordinates?.city ?? null,
      locationRegion: coordinates?.region ?? null,
      formattedAddress: coordinates?.formattedAddress ?? null,
      geocodingProvider: coordinates?.provider ?? null,
      geocodingStatus: coordinates?.status ?? "UNAVAILABLE",
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

    const existingProfile = await prisma.chefProfile.findUnique({
      where: { userId },
      select: {
        location: true,
        baseCountryCode: true,
        latitude: true,
        longitude: true,
        locationCity: true,
        locationRegion: true,
        formattedAddress: true,
        geocodingProvider: true,
        geocodingStatus: true,
      },
    })
    const coordinates = await geocodeAddress(input.location, input.baseCountryCode)
    const locationUnchanged =
      existingProfile?.location === input.location &&
      existingProfile?.baseCountryCode === input.baseCountryCode
    const retainedCoordinates = !coordinates && locationUnchanged && existingProfile?.latitude != null && existingProfile.longitude != null
      ? existingProfile
      : null

    await chefProfileRepository.updateByUserId(userId, {
      ...input,
      careerStage: normalizeChefCareerStage(input.careerStage, input.chefType) ?? null,
      specialties: encodeChefSpecialties(input.specialties),
      latitude: coordinates?.latitude ?? retainedCoordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? retainedCoordinates?.longitude ?? null,
      locationCity: coordinates?.city ?? retainedCoordinates?.locationCity ?? null,
      locationRegion: coordinates?.region ?? retainedCoordinates?.locationRegion ?? null,
      formattedAddress: coordinates?.formattedAddress ?? retainedCoordinates?.formattedAddress ?? null,
      geocodingProvider: coordinates?.provider ?? retainedCoordinates?.geocodingProvider ?? null,
      geocodingStatus: coordinates?.status ?? retainedCoordinates?.geocodingStatus ?? "UNAVAILABLE",
    })

    const profile = await chefProfileRepository.findByUserId(userId)

    return mapChefProfile(profile)
  },
}
