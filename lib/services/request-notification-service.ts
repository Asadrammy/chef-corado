import { prisma } from "@/lib/prisma"
import { shouldSendNotification } from "@/lib/notification-preferences"
import { sendPreferenceAwareEmail, emailTemplates } from "@/lib/email"
import { buildChefRequestView } from "@/lib/chef-request-view"
import { getConfiguredAppBaseUrl } from "@/lib/site-config"
import { formatServiceDateSummary } from "@/lib/multi-day-display"
import { buildNotificationCreateData, buildNotificationUpdateData } from "@/lib/notification-schema"

type ChefAlertRecipient = {
  id: string
  userId: string
  user: {
    name?: string | null
    email?: string | null
  }
}

type NotifyRequestArgs = {
  request: any
  chefs: ChefAlertRecipient[]
}

function buildRequestUrl(requestId: string) {
  return new URL(`/dashboard/chef/requests/${requestId}`, getConfiguredAppBaseUrl()).toString()
}

function getPriorityPrefix(requestView: ReturnType<typeof buildChefRequestView>) {
  if (requestView.urgentTier === "LAST_MINUTE") return "Last-minute request"
  if (requestView.urgent) return "Urgent request"
  if (requestView.highIntent) return "High-intent request"
  return "New request"
}

async function createAlertRecord(input: {
  chef: ChefAlertRecipient
  requestId: string
  message: string
  deliveryOnly: boolean
}) {
  try {
    return await prisma.notification.create({
      data: await buildNotificationCreateData({
        userId: input.chef.userId,
        type: "NEW_REQUEST_ALERT",
        message: input.message,
        dedupeKey: `NEW_REQUEST:${input.requestId}:${input.chef.userId}`,
        requestId: input.requestId,
        deliveryOnly: input.deliveryOnly,
        deliveryStatus: "PENDING",
      }) as any,
    })
  } catch (error) {
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
      return null
    }
    throw error
  }
}

export async function notifyEligibleChefsAboutRequest({ request, chefs }: NotifyRequestArgs) {
  const requestView = buildChefRequestView(request)
  const requestUrl = buildRequestUrl(requestView.id)
  const deliveries = []

  for (const chef of chefs) {
    const canEmail = await shouldSendNotification(chef.userId, "email", "requests")
    const canInApp = await shouldSendNotification(chef.userId, "in_app", "requests")
    if (!canEmail && !canInApp) {
      deliveries.push({ chefId: chef.id, skipped: true })
      continue
    }

    const message = requestView.requestMode === "MULTI_DAY"
      ? `${getPriorityPrefix(requestView)}: ${requestView.title} in ${requestView.location} (${formatServiceDateSummary(requestView.multiDayDates)}).`
      : `${getPriorityPrefix(requestView)}: ${requestView.title} in ${requestView.location}.`

    const record = await createAlertRecord({
      chef,
      requestId: requestView.id,
      message,
      deliveryOnly: !canInApp,
    })

    if (!record) {
      deliveries.push({ chefId: chef.id, skipped: true, duplicate: true })
      continue
    }

    const emailResult = canEmail
      ? await sendPreferenceAwareEmail({
          userId: chef.userId,
          topic: "requests",
          email: chef.user.email,
          subject: requestView.requestMode === "MULTI_DAY"
            ? `${getPriorityPrefix(requestView)}: ${requestView.title}`
            : `${getPriorityPrefix(requestView)}: ${requestView.title}`,
          html: requestView.requestMode === "MULTI_DAY"
            ? emailTemplates.newMultiDayRequestAlert({
                chefName: chef.user.name ?? requestView.clientGreetingName,
                clientName: requestView.clientGreetingName,
                requestTitle: requestView.title,
                requestLocation: requestView.location,
                eventDate: requestView.eventDate,
                guestCount: requestView.actualAttendeeCount ?? requestView.guestCount ?? undefined,
                currency: requestView.currency,
                budget: requestView.budget,
                serviceDates: requestView.multiDayDates,
                requestUrl,
              })
            : emailTemplates.newRequestAlert({
                chefName: chef.user.name ?? requestView.clientGreetingName,
                clientName: requestView.clientGreetingName,
                requestTitle: requestView.title,
                requestLocation: requestView.location,
                eventType: requestView.eventType ?? "Event",
                eventDate: requestView.eventDate,
                guestCount: requestView.actualAttendeeCount ?? requestView.guestCount ?? undefined,
                currency: requestView.currency,
                budget: requestView.budget,
                requestUrl,
                cuisinePreferences: requestView.cuisinePreferences,
                dietaryRequirements: requestView.dietaryRequirements,
              }),
        })
      : { success: false, error: "Email preference disabled" }

    const updateData = await buildNotificationUpdateData({
      deliveryStatus: canEmail && emailResult.success ? "SENT" : canInApp ? "SENT" : "FAILED",
      deliverySentAt: canEmail && emailResult.success ? new Date() : canInApp ? new Date() : null,
      deliveryError: canEmail && emailResult.success ? null : canInApp ? null : String(emailResult.error ?? "Notification delivery failed"),
    })

    if (Object.keys(updateData).length > 0) {
      await prisma.notification.update({
        where: { id: record.id },
        data: updateData as any,
      })
    }

    deliveries.push({
      chefId: chef.id,
      notificationId: record.id,
      emailSent: Boolean(emailResult.success),
      inAppCreated: canInApp,
    })
  }

  return {
    requestId: requestView.id,
    chefsNotified: deliveries.filter((item) => !("skipped" in item)).length,
    deliveries,
  }
}
