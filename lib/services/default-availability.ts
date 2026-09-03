import { BookingStatus } from "@/types"

export const DEFAULT_AVAILABILITY_CAPACITY = 1

export type AvailabilityBlockReason =
  | "EXPLICIT_UNAVAILABLE"
  | "FULL_CAPACITY"
  | "BOOKING_CONFLICT"

export type ChefDateAvailabilityStatus = {
  chefId: string
  date: Date
  dateKey: string
  available: boolean
  reason: AvailabilityBlockReason | null
  activeBookingCount: number
  explicitCapacity: number
  explicitBookedCount: number
  displaySlot: {
    startTime: string | null
    endTime: string | null
  } | null
  lockIds: string[]
  reservableSlotIds: string[]
}

type AvailabilitySlot = {
  id: string
  startTime: string
  endTime: string
  isAvailable: boolean
  currentBookings: number
  maxBookings: number
}

export function toAvailabilityDateKey(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10)
}

export function toAvailabilityDayStart(date: Date | string) {
  const parsed = new Date(date)
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
}

function toAvailabilityDayEnd(date: Date | string) {
  const start = toAvailabilityDayStart(date)
  return new Date(start.getTime() + 24 * 60 * 60 * 1000)
}

export function getDefaultAvailabilityLockId(chefId: string, date: Date | string) {
  return `default:${chefId}:${toAvailabilityDateKey(date)}`
}

async function countActiveBookingsForDate(tx: any, chefId: string, date: Date | string) {
  if (!tx.booking?.count) {
    return 0
  }

  const dayStart = toAvailabilityDayStart(date)
  const dayEnd = toAvailabilityDayEnd(date)

  return tx.booking.count({
    where: {
      chefId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      OR: [
        { eventDate: { gte: dayStart, lt: dayEnd } },
        { serviceDates: { some: { date: { gte: dayStart, lt: dayEnd } } } },
      ],
    },
  })
}

export async function getChefDateAvailabilityStatus(
  tx: any,
  chefId: string,
  date: Date | string
): Promise<ChefDateAvailabilityStatus> {
  const dayStart = toAvailabilityDayStart(date)
  const dateKey = toAvailabilityDateKey(dayStart)
  const [slots, activeBookingCount] = await Promise.all([
    tx.availability.findMany({
      where: {
        chefId,
        date: dayStart,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        isAvailable: true,
        currentBookings: true,
        maxBookings: true,
      },
    }) as Promise<AvailabilitySlot[]>,
    countActiveBookingsForDate(tx, chefId, dayStart),
  ])

  const unavailableSlot = slots.find((slot) => !slot.isAvailable)
  const availableSlots = slots.filter((slot) => slot.isAvailable)
  const explicitCapacity = availableSlots.reduce((sum, slot) => sum + Math.max(slot.maxBookings, 0), 0)
  const explicitBookedCount = availableSlots.reduce((sum, slot) => sum + Math.max(slot.currentBookings, 0), 0)
  const effectiveBookedCount = Math.max(explicitBookedCount, activeBookingCount)

  let reason: AvailabilityBlockReason | null = null
  if (unavailableSlot) {
    reason = "EXPLICIT_UNAVAILABLE"
  } else if (availableSlots.length > 0 && effectiveBookedCount >= explicitCapacity) {
    reason = "FULL_CAPACITY"
  } else if (availableSlots.length === 0 && activeBookingCount >= DEFAULT_AVAILABILITY_CAPACITY) {
    reason = "BOOKING_CONFLICT"
  }

  return {
    chefId,
    date: dayStart,
    dateKey,
    available: reason == null,
    reason,
    activeBookingCount,
    explicitCapacity,
    explicitBookedCount,
    displaySlot: availableSlots[0]
      ? {
          startTime: availableSlots[0].startTime,
          endTime: availableSlots[0].endTime,
        }
      : null,
    lockIds: availableSlots.length
      ? availableSlots.map((slot) => slot.id)
      : [getDefaultAvailabilityLockId(chefId, dayStart)],
    reservableSlotIds: availableSlots
      .filter((slot) => slot.currentBookings < slot.maxBookings)
      .map((slot) => slot.id),
  }
}

export async function getChefDateAvailabilityStatuses(tx: any, chefId: string, dates: Array<Date | string>) {
  const uniqueDates = Array.from(new Set(dates.map(toAvailabilityDateKey))).map(toAvailabilityDayStart)
  return Promise.all(uniqueDates.map((date) => getChefDateAvailabilityStatus(tx, chefId, date)))
}

export function getBlockingAvailabilityStatus(statuses: ChefDateAvailabilityStatus[]) {
  return statuses.find((status) => !status.available) ?? null
}

export function getAvailabilityLockIds(statuses: ChefDateAvailabilityStatus[]) {
  return Array.from(new Set(statuses.flatMap((status) => status.lockIds)))
}

export async function incrementExplicitAvailabilityBookingCounts(tx: any, statuses: ChefDateAvailabilityStatus[]) {
  for (const status of statuses) {
    const slotId = status.reservableSlotIds[0]
    if (!slotId) continue

    const updated = await tx.availability.update({
      where: {
        id: slotId,
        currentBookings: { lt: tx.availability.fields.maxBookings },
      },
      data: {
        currentBookings: { increment: 1 },
      },
    })

    if (updated.currentBookings > updated.maxBookings) {
      throw new Error("AVAILABILITY_CAPACITY_EXCEEDED")
    }
  }
}
