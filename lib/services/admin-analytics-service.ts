import { prisma } from "@/lib/prisma"

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0]
}

function buildDateRange(days: number) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)
  return { startDate, endDate }
}

function initializeDateMap(startDate: Date, endDate: Date) {
  const dateMap = new Map<string, number>()
  for (const date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    dateMap.set(formatDateKey(date), 0)
  }
  return dateMap
}

function normalizeCurrency(currency?: string | null) {
  return (currency || "GBP").toUpperCase()
}

function addCurrencyAmount(map: Map<string, number>, currency: string | null | undefined, amount: number) {
  const normalizedCurrency = normalizeCurrency(currency)
  map.set(normalizedCurrency, (map.get(normalizedCurrency) || 0) + amount)
}

function currencyMapToRows(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 }))
    .filter((item) => item.amount > 0)
}

function singleCurrencyTotal(rows: Array<{ currency: string; amount: number }>) {
  return rows.length === 1 ? rows[0].amount : undefined
}

export const adminAnalyticsService = {
  async getBookingsAnalytics(days: number) {
    const { startDate, endDate } = buildDateRange(days)
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        totalPrice: true,
        currency: true,
        bookingType: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    const bookingsByDate = initializeDateMap(startDate, endDate)
    bookings.forEach((booking) => {
      const dateStr = formatDateKey(booking.createdAt)
      bookingsByDate.set(dateStr, (bookingsByDate.get(dateStr) || 0) + 1)
    })

    const data = Array.from(bookingsByDate.entries()).map(([date, count]) => ({ date, count }))
    const totalBookings = bookings.length
    const averageDailyBookings = totalBookings / days
    const daysWithBookings = data.filter((item) => item.count > 0).length
    const statusBreakdown = bookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1
      return acc
    }, {})
    const typeBreakdown = bookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.bookingType] = (acc[booking.bookingType] || 0) + 1
      return acc
    }, {})
    const totalBookingValueByCurrencyMap = new Map<string, number>()
    bookings.forEach((booking) => addCurrencyAmount(totalBookingValueByCurrencyMap, booking.currency, booking.totalPrice))
    const totalBookingValueByCurrency = currencyMapToRows(totalBookingValueByCurrencyMap)

    return {
      data,
      summary: {
        totalBookings,
        averageDailyBookings: Math.round(averageDailyBookings * 100) / 100,
        daysWithBookings,
        totalBookingValue: singleCurrencyTotal(totalBookingValueByCurrency),
        totalBookingValueByCurrency,
        statusBreakdown,
        typeBreakdown,
        dateRange: {
          start: formatDateKey(startDate),
          end: formatDateKey(endDate),
        },
      },
    }
  },

  async getRevenueAnalytics(days: number) {
    const { startDate, endDate } = buildDateRange(days)
    const payments = await prisma.payment.findMany({
      where: {
        status: "RELEASED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        booking: {
          select: {
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    const revenueByDate = new Map<string, Map<string, number>>()
    initializeDateMap(startDate, endDate).forEach((_revenue, date) => {
      revenueByDate.set(date, new Map())
    })
    const totalRevenueByCurrencyMap = new Map<string, number>()
    payments.forEach((payment) => {
      const dateStr = formatDateKey(payment.createdAt)
      const currency = normalizeCurrency(payment.currency)
      const dateCurrencyMap = revenueByDate.get(dateStr) || new Map<string, number>()
      dateCurrencyMap.set(currency, (dateCurrencyMap.get(currency) || 0) + payment.commissionAmount)
      revenueByDate.set(dateStr, dateCurrencyMap)
      addCurrencyAmount(totalRevenueByCurrencyMap, currency, payment.commissionAmount)
    })

    const data = Array.from(revenueByDate.entries()).map(([date, currencies]) => ({
      date,
      revenueByCurrency: Object.fromEntries(
        Array.from(currencies.entries()).map(([currency, amount]) => [currency, Math.round(amount * 100) / 100])
      ),
    }))

    const revenueByCurrency = currencyMapToRows(totalRevenueByCurrencyMap)
    const averageDailyRevenueByCurrency = revenueByCurrency.map((item) => ({
      currency: item.currency,
      amount: Math.round((item.amount / days) * 100) / 100,
    }))
    const daysWithRevenue = data.filter((item) =>
      Object.values(item.revenueByCurrency).some((amount) => Number(amount) > 0)
    ).length

    return {
      data,
      summary: {
        totalRevenue: singleCurrencyTotal(revenueByCurrency),
        totalRevenueByCurrency: revenueByCurrency,
        averageDailyRevenue: singleCurrencyTotal(averageDailyRevenueByCurrency),
        averageDailyRevenueByCurrency,
        daysWithRevenue,
        totalPayments: payments.length,
        dateRange: {
          start: formatDateKey(startDate),
          end: formatDateKey(endDate),
        },
      },
    }
  },

  async getUsersAnalytics(days: number) {
    const { startDate, endDate } = buildDateRange(days)
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
        role: true,
        name: true,
        email: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    const usersByDate = initializeDateMap(startDate, endDate)
    users.forEach((user) => {
      const dateStr = formatDateKey(user.createdAt)
      usersByDate.set(dateStr, (usersByDate.get(dateStr) || 0) + 1)
    })

    const data = Array.from(usersByDate.entries()).map(([date, newUsers]) => ({ date, newUsers }))
    const totalNewUsers = users.length
    const averageDailyUsers = totalNewUsers / days
    const daysWithNewUsers = data.filter((item) => item.newUsers > 0).length
    const roleBreakdown = users.reduce<Record<string, number>>((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})
    const totalPlatformUsers = await prisma.user.count()

    return {
      data,
      summary: {
        totalNewUsers,
        averageDailyUsers: Math.round(averageDailyUsers * 100) / 100,
        daysWithNewUsers,
        roleBreakdown,
        totalPlatformUsers,
        dateRange: {
          start: formatDateKey(startDate),
          end: formatDateKey(endDate),
        },
      },
    }
  },
}
