import fs from "fs"
import path from "path"

import {
  getCompletedJobsCount,
  pluralizeCompletedJobs,
  serializePublicChef,
} from "../../lib/public-chef-view"
import {
  BALANCE_DUE_DAYS_BEFORE_EVENT,
  BALANCE_FINAL_RISK_WINDOW_DAYS,
  BALANCE_RETRY_INTERVAL_DAYS,
  MAX_BALANCE_AUTOMATED_RETRIES,
  addDays,
  getBalanceFinalRiskBoundary,
  getNextBalanceRetryAt,
  isInsideBalanceFinalRiskWindow,
} from "../../lib/payment-plan-rules"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("latest client feedback closure contracts", () => {
  it("public chef serializer allowlists fields and excludes private compliance/profile data", () => {
    const dto = serializePublicChef({
      id: "chef-1",
      bio: "Public bio",
      experience: 10,
      location: "London",
      radius: 50,
      profileImage: "/chef.jpg",
      chefType: "PRIVATE_CHEF",
      specialties: JSON.stringify(["PRIVATE_DINING"]),
      cuisineType: "Italian",
      preferredCurrency: "GBP",
      eventsPerMonth: 12,
      careerStage: "ASPIRING_CHEF_NO_EXPERIENCE",
      certifications: "Level 2 Food Hygiene",
      isApproved: true,
      verificationStatus: "APPROVED",
      foodHygieneCertificateUrl: "/api/chef/certificates/private.pdf",
      insuranceDocumentUrl: "/insurance/private.pdf",
      reviewNotes: "Internal admin note",
      approvedBy: "admin-1",
      user: {
        id: "user-1",
        name: "Chef Rue",
        email: "rue@example.com",
        phone: "+447000000000",
        verified: false,
        experienceLevel: "BEGINNER",
      },
      menus: [],
      experiences: [],
      reviews: [{ rating: 5 }],
      bookings: [{ id: "booking-1", status: "COMPLETED" }],
      _count: { reviews: 1 },
    })

    const serialized = JSON.stringify(dto)
    expect(dto.completedJobs).toBe(1)
    expect(serialized).not.toContain("eventsPerMonth")
    expect(serialized).not.toContain("careerStage")
    expect(serialized).not.toContain("experienceLevel")
    expect(serialized).not.toContain("BEGINNER")
    expect(serialized).not.toContain("certifications")
    expect(serialized).not.toContain("foodHygieneCertificateUrl")
    expect(serialized).not.toContain("insuranceDocumentUrl")
    expect(serialized).not.toContain("verificationStatus")
    expect(serialized).not.toContain("isApproved")
    expect(serialized).not.toContain("reviewNotes")
    expect(serialized).not.toContain("approvedBy")
    expect(serialized).not.toContain("rue@example.com")
    expect(serialized).not.toContain("+447000000000")
  })

  it("counts only completed ChefaChef booking records as public jobs", () => {
    expect(getCompletedJobsCount({
      bookings: [
        { status: "COMPLETED" },
        { status: "CANCELLED" },
        { status: "PENDING" },
        { status: "PAYMENT_FAILED" },
      ],
    })).toBe(1)
    expect(pluralizeCompletedJobs(1)).toBe("1 completed ChefaChef job")
    expect(pluralizeCompletedJobs(2)).toBe("2 completed ChefaChef jobs")
  })

  it("keeps public chef and search APIs free of private field selections", () => {
    const sources = [
      read("app/api/chefs/route.ts"),
      read("app/api/chefs/search/route.ts"),
      read("app/api/chefs/[chefId]/route.ts"),
      read("app/api/search/route.ts"),
      read("app/api/experiences/route.ts"),
      read("app/api/experiences/[id]/route.ts"),
    ].join("\n")

    expect(sources).not.toContain("email: true")
    expect(sources).not.toContain("experienceLevel: true")
    expect(sources).not.toContain("careerStage: true")
    expect(sources).not.toContain("verified: true")
    expect(sources).not.toContain("certifications: true")
    expect(sources).not.toContain("eventsPerMonth: true")
    expect(sources).not.toContain("foodHygieneCertificateUrl: true")
    expect(sources).not.toContain("insuranceDocumentUrl: true")
    expect(sources).not.toContain("reviewNotes: true")
  })

  it("requires approved chef eligibility for public experience list and direct detail access", () => {
    const listRoute = read("app/api/experiences/route.ts")
    const detailRoute = read("app/api/experiences/[id]/route.ts")
    const publicPage = read("app/(public)/experiences/[id]/page.tsx")

    expect(listRoute).toContain("publicChefEligibilityWhere")
    expect(detailRoute).toContain("findFirst")
    expect(detailRoute).toContain("chef: publicChefEligibilityWhere")
    expect(publicPage).toContain("chef: publicChefEligibilityWhere")
    expect(`${detailRoute}\n${publicPage}`).not.toContain("email: true")
    expect(`${detailRoute}\n${publicPage}`).not.toContain("verified: true")
  })

  it("implements the D-30 to D-7 balance recovery schedule without impossible ten retries", () => {
    const eventDate = new Date("2026-10-31T12:00:00.000Z")
    const initialAttemptAt = addDays(eventDate, -BALANCE_DUE_DAYS_BEFORE_EVENT)
    const retryDates: Date[] = []
    let cursor: Date | null = initialAttemptAt

    while (cursor) {
      const next = getNextBalanceRetryAt({ eventAnchorDate: eventDate, lastAttemptAt: cursor })
      if (next) retryDates.push(next)
      cursor = next
    }

    expect(BALANCE_RETRY_INTERVAL_DAYS).toBe(3)
    expect(BALANCE_FINAL_RISK_WINDOW_DAYS).toBe(7)
    expect(MAX_BALANCE_AUTOMATED_RETRIES).toBe(7)
    expect(retryDates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-10-04",
      "2026-10-07",
      "2026-10-10",
      "2026-10-13",
      "2026-10-16",
      "2026-10-19",
      "2026-10-22",
    ])
    expect(getBalanceFinalRiskBoundary(eventDate).toISOString().slice(0, 10)).toBe("2026-10-24")
    expect(isInsideBalanceFinalRiskWindow({ eventAnchorDate: eventDate, now: new Date("2026-10-24T00:00:00.000Z") })).toBe(true)
  })

  it("uses unique Stripe idempotency per balance attempt and never documents exact dunning publicly", () => {
    const service = read("lib/services/payment-plan-service.ts")
    const publicCopy = [
      read("app/(public)/faq/page.tsx"),
      read("app/(public)/pricing/page.tsx"),
      read("app/(public)/terms/chef/page.tsx"),
    ].join("\n")

    expect(service).toContain('generateIdempotencyKey("BALANCE_ATTEMPT"')
    expect(service).not.toContain("idempotencyKey: installment.idempotencyKey")
    expect(publicCopy).not.toMatch(/every\s+3\s+days/i)
    expect(publicCopy).not.toMatch(/7\s+retries/i)
    expect(publicCopy).not.toMatch(/8\s+total/i)
    expect(publicCopy).not.toMatch(/D-27/i)
  })

  it("keeps chef hygiene upload from auto-approving chef accounts", () => {
    const certificateRoute = read("app/api/chef/certificates/route.ts")
    const adminChefService = read("lib/services/admin-chef-service.ts")

    expect(certificateRoute).toContain('foodHygieneCertificateReviewStatus: "PENDING"')
    expect(certificateRoute).not.toContain("isApproved: true")
    expect(adminChefService).not.toContain("tx.user.update")
    expect(adminChefService).not.toContain("verified: approved")
  })
})
