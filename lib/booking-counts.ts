type RequestBookingCountSource = {
  guestCount?: number | null
  studentCount?: number | null
  eventType?: string | null
}

type ExperienceBookingCountSource = {
  serviceType?: string | null
  minGuests?: number | null
  maxGuests?: number | null
  price?: number | null
  pricePerStudent?: number | null
}

export function getProposalBookingCounts(request: RequestBookingCountSource) {
  const guestCount = Number(request.guestCount)

  if (!Number.isInteger(guestCount) || guestCount < 1) {
    throw new Error("INVALID_REQUEST_GUEST_COUNT")
  }

  const isCookingClass = request.eventType === "Cooking Class"
  const rawStudentCount = isCookingClass
    ? Number(request.studentCount ?? request.guestCount)
    : request.studentCount == null
      ? null
      : Number(request.studentCount)

  if (isCookingClass && (!Number.isInteger(rawStudentCount) || Number(rawStudentCount) < 1)) {
    throw new Error("INVALID_REQUEST_STUDENT_COUNT")
  }

  return {
    guestCount,
    studentCount: isCookingClass
      ? Number(rawStudentCount)
      : Number.isInteger(rawStudentCount) && Number(rawStudentCount) > 0
        ? Number(rawStudentCount)
        : null,
  }
}

export function validateExperienceBookingCounts(
  experience: ExperienceBookingCountSource,
  selectedCount: number
) {
  if (!Number.isInteger(selectedCount) || selectedCount < 1) {
    throw new Error("INVALID_BOOKING_COUNT")
  }

  if (experience.minGuests && selectedCount < experience.minGuests) {
    throw new Error(`MINIMUM_COUNT_REQUIRED:${experience.minGuests}`)
  }

  if (experience.maxGuests && selectedCount > experience.maxGuests) {
    throw new Error(`MAXIMUM_COUNT_EXCEEDED:${experience.maxGuests}`)
  }

  const isCookingClass = experience.serviceType === "COOKING_CLASS"
  const unitPrice = isCookingClass
    ? (experience.pricePerStudent ?? experience.price)
    : experience.price

  if (unitPrice == null || !Number.isFinite(Number(unitPrice)) || Number(unitPrice) <= 0) {
    throw new Error(isCookingClass ? "INVALID_PRICE_PER_STUDENT" : "INVALID_EXPERIENCE_PRICE")
  }

  return {
    guestCount: selectedCount,
    studentCount: isCookingClass ? selectedCount : null,
    unitPrice: Number(unitPrice),
    totalPrice: Number(unitPrice) * selectedCount,
  }
}
