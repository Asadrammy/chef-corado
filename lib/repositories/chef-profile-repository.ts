import { prisma } from "@/lib/prisma"

const userProfileSelect = {
  name: true,
  email: true,
  phone: true,
  verified: true,
  experienceLevel: true,
  termsAcceptedAt: true,
  termsVersion: true,
  acceptedVia: true,
}

export const chefProfileRepository = {
  findByUserId(userId: string) {
    return prisma.chefProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: userProfileSelect,
        },
        _count: {
          select: {
            reviews: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    })
  },

  createForUser(userId: string, data: {
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
    foodHygieneCertificateUploadedAt?: Date
    foodHygieneCertificateReviewedAt?: Date
    foodHygieneCertificateReviewedBy?: string
    foodHygieneCertificateReviewStatus?: string
    latitude: number | null
    longitude: number | null
    locationCity?: string | null
    locationRegion?: string | null
    formattedAddress?: string | null
    geocodingProvider?: string | null
    geocodingStatus?: string
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.phone !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            phone: data.phone || null,
          },
        })
      }

      return tx.chefProfile.create({
        data: {
          bio: data.bio,
          experience: data.experience,
          location: data.location,
          radius: data.radius,
          baseCountryCode: data.baseCountryCode,
          preferredCurrency: data.preferredCurrency,
          profileImage: data.profileImage,
          chefType: data.chefType,
          certifications: data.certifications,
          cuisineType: data.cuisineType,
          eventsPerMonth: data.eventsPerMonth,
          stripeAccountId: data.stripeAccountId,
          stripeOnboardingComplete: data.stripeOnboardingComplete,
          rightToWorkUkConfirmed: data.rightToWorkUkConfirmed,
          foodHygieneLevel2Confirmed: data.foodHygieneLevel2Confirmed,
          foodHygieneCertificateUrl: data.foodHygieneCertificateUrl,
          foodHygieneCertificateUploadedAt: data.foodHygieneCertificateUploadedAt,
          foodHygieneCertificateReviewedAt: data.foodHygieneCertificateReviewedAt,
          foodHygieneCertificateReviewedBy: data.foodHygieneCertificateReviewedBy,
          foodHygieneCertificateReviewStatus: data.foodHygieneCertificateReviewStatus,
          latitude: data.latitude,
          longitude: data.longitude,
          locationCity: data.locationCity,
          locationRegion: data.locationRegion,
          formattedAddress: data.formattedAddress,
          geocodingProvider: data.geocodingProvider,
          geocodingStatus: data.geocodingStatus ?? "UNVERIFIED",
          user: { connect: { id: userId } },
        },
        include: {
          user: {
            select: userProfileSelect,
          },
          _count: {
            select: {
              reviews: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      })
    })
  },

  updateByUserId(userId: string, data: {
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
    foodHygieneCertificateUploadedAt?: Date
    foodHygieneCertificateReviewedAt?: Date
    foodHygieneCertificateReviewedBy?: string
    foodHygieneCertificateReviewStatus?: string
    latitude: number | null
    longitude: number | null
    locationCity?: string | null
    locationRegion?: string | null
    formattedAddress?: string | null
    geocodingProvider?: string | null
    geocodingStatus?: string
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.phone !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            phone: data.phone || null,
          },
        })
      }

      return tx.chefProfile.update({
        where: { userId },
        data: {
          bio: data.bio,
          experience: data.experience,
          location: data.location,
          radius: data.radius,
          baseCountryCode: data.baseCountryCode,
          preferredCurrency: data.preferredCurrency,
          profileImage: data.profileImage,
          chefType: data.chefType,
          certifications: data.certifications,
          cuisineType: data.cuisineType,
          eventsPerMonth: data.eventsPerMonth,
          stripeAccountId: data.stripeAccountId,
          stripeOnboardingComplete: data.stripeOnboardingComplete,
          rightToWorkUkConfirmed: data.rightToWorkUkConfirmed,
          foodHygieneLevel2Confirmed: data.foodHygieneLevel2Confirmed,
          foodHygieneCertificateUrl: data.foodHygieneCertificateUrl,
          foodHygieneCertificateUploadedAt: data.foodHygieneCertificateUploadedAt,
          foodHygieneCertificateReviewedAt: data.foodHygieneCertificateReviewedAt,
          foodHygieneCertificateReviewedBy: data.foodHygieneCertificateReviewedBy,
          foodHygieneCertificateReviewStatus: data.foodHygieneCertificateReviewStatus,
          latitude: data.latitude,
          longitude: data.longitude,
          locationCity: data.locationCity,
          locationRegion: data.locationRegion,
          formattedAddress: data.formattedAddress,
          geocodingProvider: data.geocodingProvider,
          geocodingStatus: data.geocodingStatus ?? "UNVERIFIED",
        },
        include: {
          user: {
            select: userProfileSelect,
          },
          _count: {
            select: {
              reviews: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      })
    })
  },
}
