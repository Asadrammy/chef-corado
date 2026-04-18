import { addDays } from "date-fns"

export function normalizeDateInput(value: Date | string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("INVALID_DATE")
    }

    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, "0"),
      String(value.getUTCDate()).padStart(2, "0"),
    ].join("-")
  }

  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("INVALID_DATE")
  }

  return trimmed
}

export function toUtcDateOnly(value: Date | string): Date {
  const normalized = normalizeDateInput(value)
  const [year, month, day] = normalized.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function getMonthDateRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("INVALID_MONTH")
  }

  const [year, monthNumber] = month.split("-").map(Number)
  const start = new Date(Date.UTC(year, monthNumber - 1, 1))
  const end = addDays(new Date(Date.UTC(year, monthNumber, 0)), 1)

  return { start, endExclusive: end }
}

export function getDateRange(startDate: string, endDate: string) {
  const start = toUtcDateOnly(startDate)
  const endExclusive = addDays(toUtcDateOnly(endDate), 1)

  return { start, endExclusive }
}

export function formatDateOnly(value: Date | string): string {
  return normalizeDateInput(value)
}
