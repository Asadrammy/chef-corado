import {
  getPaymentEligibility,
  FLEXIBLE_PAYMENT_WINDOW_DAYS,
  PAYMENT_PLAN_TYPES,
  STANDARD_BALANCE_PERCENT,
  STANDARD_DEPOSIT_PERCENT,
  splitDepositBalance,
  splitEvenly,
  sumMinorUnits,
  toMinorUnits,
} from "@/lib/payment-plan-rules"
import { getRequestUrgency } from "@/lib/request-priority"

describe("Pass 2 payment plan rules", () => {
  const now = new Date("2026-08-13T12:00:00.000Z")
  const msPerDay = 24 * 60 * 60 * 1000

  it("keeps the flexible-payment eligibility threshold at the client-confirmed 35 days", () => {
    expect(FLEXIBLE_PAYMENT_WINDOW_DAYS).toBe(35)
  })

  it("offers deposit, split bill, and full payment when the event is more than 5 weeks away", () => {
    const result = getPaymentEligibility({
      eventDate: new Date(now.getTime() + 36 * msPerDay),
      now,
    })

    expect(result.flexiblePaymentEligible).toBe(true)
    expect(result.availablePlanTypes).toEqual([
      PAYMENT_PLAN_TYPES.DEPOSIT,
      PAYMENT_PLAN_TYPES.SPLIT_BILL,
      PAYMENT_PLAN_TYPES.FULL_PAYMENT,
    ])
  })

  it("makes full payment mandatory when the event is 35 days or fewer away", () => {
    const result = getPaymentEligibility({
      eventDate: new Date(now.getTime() + FLEXIBLE_PAYMENT_WINDOW_DAYS * msPerDay),
      now,
    })

    expect(result.flexiblePaymentEligible).toBe(false)
    expect(result.availablePlanTypes).toEqual([PAYMENT_PLAN_TYPES.FULL_PAYMENT])
    expect(result.mandatoryPlanType).toBe(PAYMENT_PLAN_TYPES.FULL_PAYMENT)
  })

  it("does not apply the old 6-week restriction at 36 days", () => {
    const result = getPaymentEligibility({
      eventDate: new Date(now.getTime() + 36 * msPerDay),
      now,
    })

    expect(result.flexiblePaymentEligible).toBe(true)
    expect(result.mandatoryPlanType).toBeNull()
  })

  it("keeps 35-day urgent classification aligned while last-minute remains 24-72 hours", () => {
    expect(getRequestUrgency({
      eventDate: new Date(now.getTime() + 35 * msPerDay),
      now,
    })).toMatchObject({ isUrgent: true, tier: "URGENT" })

    expect(getRequestUrgency({
      eventDate: new Date(now.getTime() + 36 * msPerDay),
      now,
    })).toMatchObject({ isUrgent: false, tier: "STANDARD" })

    expect(getRequestUrgency({
      eventDate: new Date(now.getTime() + 72 * 60 * 60 * 1000),
      now,
    })).toMatchObject({ isUrgent: true, tier: "LAST_MINUTE" })
  })

  it("uses the earliest Multi-Day service date as the commercial anchor", () => {
    const result = getPaymentEligibility({
      eventDate: new Date("2026-11-01T12:00:00.000Z"),
      serviceDates: [
        new Date("2026-11-03T12:00:00.000Z"),
        new Date(now.getTime() + 36 * msPerDay),
      ],
      now,
    })

    expect(result.eventAnchorDate.toISOString()).toBe("2026-09-18T12:00:00.000Z")
    expect(result.availablePlanTypes).toEqual([
      PAYMENT_PLAN_TYPES.DEPOSIT,
      PAYMENT_PLAN_TYPES.SPLIT_BILL,
      PAYMENT_PLAN_TYPES.FULL_PAYMENT,
    ])
  })

  it("splits 20 percent deposit and 80 percent balance exactly in minor units", () => {
    const total = toMinorUnits(1000)
    const { depositAmountMinor, balanceAmountMinor } = splitDepositBalance(total)

    expect(STANDARD_DEPOSIT_PERCENT).toBe(20)
    expect(STANDARD_BALANCE_PERCENT).toBe(80)
    expect(depositAmountMinor).toBe(20000)
    expect(balanceAmountMinor).toBe(80000)
    expect(depositAmountMinor + balanceAmountMinor).toBe(total)
  })

  it("splits guest shares exactly without losing pennies", () => {
    const shares = splitEvenly(10001, 3)

    expect(shares).toEqual([3334, 3334, 3333])
    expect(sumMinorUnits(shares)).toBe(10001)
  })
})
