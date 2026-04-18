import { prisma } from "@/lib/prisma"

export type NotificationChannel = "email" | "in_app" // | "push" - not implemented yet
export type NotificationTopic = "messages" | "bookings" | "requests"

export type NotificationPreferences = {
  emailMessages: boolean
  emailBookings: boolean
  emailRequests: boolean
  inAppMessages: boolean
  inAppBookings: boolean
  inAppRequests: boolean
}

export function getDefaultNotificationPreferences(): NotificationPreferences {
  return {
    emailMessages: true,
    emailBookings: true,
    emailRequests: true,
    inAppMessages: true,
    inAppBookings: true,
    inAppRequests: true,
  }
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  })

  if (!preferences) {
    return getDefaultNotificationPreferences()
  }

  return {
    emailMessages: preferences.emailMessages,
    emailBookings: preferences.emailBookings,
    emailRequests: preferences.emailRequests,
    inAppMessages: preferences.inAppMessages,
    inAppBookings: preferences.inAppBookings,
    inAppRequests: preferences.inAppRequests,
  }
}

export async function shouldSendNotification(userId: string, channel: NotificationChannel, topic: NotificationTopic) {
  const preferences = await getNotificationPreferences(userId)

  switch (`${channel}:${topic}`) {
    case "email:messages":
      return preferences.emailMessages
    case "email:bookings":
      return preferences.emailBookings
    case "email:requests":
      return preferences.emailRequests
    case "in_app:messages":
      return preferences.inAppMessages
    case "in_app:bookings":
      return preferences.inAppBookings
    case "in_app:requests":
      return preferences.inAppRequests
    default:
      return true
  }
}
