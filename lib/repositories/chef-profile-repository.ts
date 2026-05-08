import { prisma } from "@/lib/prisma"

export const chefProfileRepository = {
  findByUserId(userId: string) {
    return prisma.chefProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            verified: true,
            experienceLevel: true,
            termsAcceptedAt: true,
            termsVersion: true,
          },
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
    latitude: number | null
    longitude: number | null
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.phone !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { phone: data.phone || null },
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
          eventsPerMonth: data.eventsPerMonth,
          stripeAccountId: data.stripeAccountId,
          stripeOnboardingComplete: data.stripeOnboardingComplete,
          latitude: data.latitude,
          longitude: data.longitude,
          user: { connect: { id: userId } },
        } as any,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              verified: true,
              experienceLevel: true,
              termsAcceptedAt: true,
              termsVersion: true,
            },
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
    latitude: number | null
    longitude: number | null
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.phone !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { phone: data.phone || null },
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
          eventsPerMonth: data.eventsPerMonth,
          stripeAccountId: data.stripeAccountId,
          stripeOnboardingComplete: data.stripeOnboardingComplete,
          latitude: data.latitude,
          longitude: data.longitude,
        } as any,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              verified: true,
              experienceLevel: true,
              termsAcceptedAt: true,
              termsVersion: true,
            },
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
