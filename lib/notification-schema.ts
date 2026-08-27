import { prisma } from "@/lib/prisma"

type NotificationColumnAvailability = {
  requestId: boolean
  deliveryOnly: boolean
  deliveryStatus: boolean
  deliverySentAt: boolean
  deliveryError: boolean
  dedupeKey: boolean
}

let cachedAvailability: NotificationColumnAvailability | null = null

async function hasNotificationColumn(columnName: string) {
  if (typeof prisma.$queryRaw !== "function") {
    return false
  }

  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Notification'
        AND column_name = ${columnName}
    ) AS "exists"
  `

  return Boolean(rows[0]?.exists)
}

export async function getNotificationColumnAvailability(): Promise<NotificationColumnAvailability> {
  if (cachedAvailability) {
    return cachedAvailability
  }

  const entries = await Promise.all(
    ([
      "requestId",
      "deliveryOnly",
      "deliveryStatus",
      "deliverySentAt",
      "deliveryError",
      "dedupeKey",
    ] as const).map(async (column) => [column, await hasNotificationColumn(column)] as const)
  )

  cachedAvailability = Object.fromEntries(entries) as NotificationColumnAvailability
  return cachedAvailability
}

export async function buildNotificationVisibilityWhere(userId: string, unreadOnly = false) {
  const availability = await getNotificationColumnAvailability()
  const where: Record<string, unknown> = { userId }

  if (availability.deliveryOnly) {
    where.deliveryOnly = false
  }

  if (unreadOnly) {
    where.isRead = false
  }

  return where
}

export async function buildNotificationCreateData(input: {
  userId: string
  type: string
  message: string
  requestId?: string
  dedupeKey?: string
  deliveryOnly?: boolean
  deliveryStatus?: string
  deliverySentAt?: Date | null
  deliveryError?: string | null
}) {
  const availability = await getNotificationColumnAvailability()
  const data: Record<string, unknown> = {
    userId: input.userId,
    type: input.type,
    message: input.message,
  }

  if (availability.requestId && input.requestId) {
    data.requestId = input.requestId
  }

  if (availability.dedupeKey && input.dedupeKey) {
    data.dedupeKey = input.dedupeKey
  }

  if (availability.deliveryOnly && typeof input.deliveryOnly === "boolean") {
    data.deliveryOnly = input.deliveryOnly
  }

  if (availability.deliveryStatus && input.deliveryStatus) {
    data.deliveryStatus = input.deliveryStatus
  }

  if (availability.deliverySentAt) {
    data.deliverySentAt = input.deliverySentAt ?? null
  }

  if (availability.deliveryError) {
    data.deliveryError = input.deliveryError ?? null
  }

  return data
}

export async function buildNotificationUpdateData(input: {
  deliveryStatus?: string
  deliverySentAt?: Date | null
  deliveryError?: string | null
}) {
  const availability = await getNotificationColumnAvailability()
  const data: Record<string, unknown> = {}

  if (availability.deliveryStatus && input.deliveryStatus) {
    data.deliveryStatus = input.deliveryStatus
  }

  if (availability.deliverySentAt) {
    data.deliverySentAt = input.deliverySentAt ?? null
  }

  if (availability.deliveryError) {
    data.deliveryError = input.deliveryError ?? null
  }

  return data
}
