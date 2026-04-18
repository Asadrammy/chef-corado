import { calculateDistance } from "@/lib/geo"
import { emailTemplates, sendPreferenceAwareEmail } from "@/lib/email"
import { requestRepository } from "@/lib/repositories/request-repository"
import { Role } from "@/types"

export const requestService = {
  async createRequest(userId: string, input: {
    title: string
    description?: string
    eventDate: string
    location: string
    latitude?: number
    longitude?: number
    budget: number
    details: string
  }) {
    const created = await requestRepository.createRequest({
      clientId: userId,
      title: input.title,
      description: input.description,
      eventDate: new Date(input.eventDate),
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      budget: input.budget,
      details: input.details,
    })

    if (created.latitude && created.longitude) {
      const matchingChefs = await requestRepository.findApprovedChefsWithCoordinates()

      const eligibleChefs = matchingChefs.filter((chef) => {
        if (!chef.latitude || !chef.longitude || chef.radius <= 0) {
          return false
        }

        const distance = calculateDistance(
          created.latitude as number,
          created.longitude as number,
          chef.latitude,
          chef.longitude
        )

        return distance <= chef.radius
      })

      await Promise.allSettled(
        eligibleChefs.map((chef) =>
          sendPreferenceAwareEmail({
            userId: chef.userId,
            topic: "requests",
            email: chef.user.email,
            subject: `New Service Request: ${created.title}`,
            html: emailTemplates.newRequest(
              chef.user.name,
              created.title,
              created.location,
              created.budget
            ),
          })
        )
      )
    }

    return created
  },

  async listRequests(userId: string | undefined | null, role: string | null | undefined) {
    if (!role) {
      throw new Error("UNAUTHORIZED")
    }

    if (role === Role.CLIENT) {
      if (!userId) {
        throw new Error("UNAUTHORIZED")
      }

      return { requests: await requestRepository.listRequestsForClient(userId) }
    }

    if (role === Role.CHEF) {
      if (!userId) {
        throw new Error("UNAUTHORIZED")
      }

      const chefProfile = await requestRepository.findChefProfileByUserId(userId)

      if (!chefProfile) {
        return {
          error: "Chef profile not found. Please create your chef profile first.",
          needsProfile: true,
          requests: [],
          status: 404,
        }
      }

      if (chefProfile.latitude == null || chefProfile.longitude == null || chefProfile.radius <= 0) {
        return {
          error: "Chef location or radius not properly set. Please update your profile.",
          needsLocation: chefProfile.latitude == null || chefProfile.longitude == null,
          needsRadius: chefProfile.radius <= 0,
          requests: [],
          status: 400,
        }
      }

      const allRequests = await requestRepository.listChefMarketplaceRequests(chefProfile.id)
      const filteredRequests = allRequests
        .map((request) => {
          const distance = calculateDistance(
            chefProfile.latitude as number,
            chefProfile.longitude as number,
            request.latitude as number,
            request.longitude as number
          )

          return {
            ...request,
            distanceKm: Math.round(distance * 10) / 10,
          }
        })
        .filter((request) => request.distanceKm <= chefProfile.radius)

      return { requests: filteredRequests }
    }

    return { requests: await requestRepository.listAllRequests() }
  },
}
