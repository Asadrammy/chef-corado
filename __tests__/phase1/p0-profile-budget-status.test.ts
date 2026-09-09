import { readFileSync } from "fs"

import { chefProfileSchema } from "@/lib/chef-profile-validation"
import { isValidChefProfileImageReference } from "@/lib/chef-profile-image-reference"
import {
  calculateMultiDayBudgetTotal,
  canonicalizeMultiDayBudgetInput,
  restoreMultiDayBudgetDraft,
} from "@/lib/multi-day-budget"
import { getClientRequestStatusLabel } from "@/lib/request-lifecycle"

const baseProfilePayload = {
  location: "EC3R 8EE, London, United Kingdom",
  radius: 50,
  baseCountryCode: "GB",
  preferredCurrency: "GBP",
  specialties: ["PRIVATE_DINING"],
}

describe("Phase 1 P0 profile save validation", () => {
  it("accepts existing DB-backed user profile photo routes", () => {
    expect(isValidChefProfileImageReference("/api/user/profile-photo/cmtjmy4e30000ecvb535cftmn?v=1788531359503")).toBe(true)
    expect(() => chefProfileSchema.parse({
      ...baseProfilePayload,
      profileImage: "/api/user/profile-photo/cmtjmy4e30000ecvb535cftmn?v=1788531359503",
      cuisineType: "Italian",
      eventsPerMonth: 12,
    })).not.toThrow()
  })

  it("allows radius-only, cuisine-only, and events-per-month-only profile updates", () => {
    expect(chefProfileSchema.parse({ ...baseProfilePayload, radius: 75 }).radius).toBe(75)
    expect(chefProfileSchema.parse({ ...baseProfilePayload, cuisineType: "Mediterranean" }).cuisineType).toBe("Mediterranean")
    expect(chefProfileSchema.parse({ ...baseProfilePayload, eventsPerMonth: 8 }).eventsPerMonth).toBe(8)
  })

  it("keeps unchanged profile photos out of routine save payloads", () => {
    const source = readFileSync("app/dashboard/chef/profile/page.tsx", "utf8")
    expect(source).toContain("formData.profileImage !== profile?.profileImage")
    expect(source).toContain("getApiErrorMessage")
  })

  it("rejects arbitrary internal profile image URLs", () => {
    expect(isValidChefProfileImageReference("/api/admin/users/secret")).toBe(false)
    expect(() => chefProfileSchema.parse({ ...baseProfilePayload, profileImage: "/api/admin/users/secret" })).toThrow()
  })
})

describe("Phase 1 P0 multi-day budget integrity", () => {
  it("preserves a legacy/windowshopper £1200 draft as TOTAL_EVENT", () => {
    expect(restoreMultiDayBudgetDraft({ budget: 1200 })).toEqual({
      budgetMode: "TOTAL_EVENT",
      totalBudget: "1200",
      defaultDailyBudget: "",
      dateBudget: "",
    })
  })

  it("keeps 3 days / £1200 TOTAL as £1200 even when stale date budgets exist", () => {
    expect(calculateMultiDayBudgetTotal({
      budgetMode: "TOTAL_EVENT",
      totalBudget: 1200,
      dateBudgets: [1200, 1200, 1200],
    })).toBe(1200)
    expect(canonicalizeMultiDayBudgetInput({
      budgetMode: "TOTAL_EVENT",
      totalBudget: 1200,
      budget: 3600,
      dateBudgets: [1200, 1200, 1200],
    })).toEqual({ budget: 1200, totalBudget: 1200, defaultDailyBudget: null })
  })

  it("calculates 3 days / £400 PER_DAY as £1200", () => {
    expect(calculateMultiDayBudgetTotal({
      budgetMode: "PER_DAY",
      defaultDailyBudget: 400,
      dateBudgets: [400, 400, 400],
    })).toBe(1200)
    expect(canonicalizeMultiDayBudgetInput({
      budgetMode: "PER_DAY",
      defaultDailyBudget: 400,
      dateBudgets: [400, 400, 400],
    })).toEqual({ budget: 1200, totalBudget: 1200, defaultDailyBudget: 400 })
  })

  it("recalculates manual per-day overrides without mutating the budget mode", () => {
    expect(calculateMultiDayBudgetTotal({
      budgetMode: "PER_DAY",
      defaultDailyBudget: 300,
      dateBudgets: [400, 350, null],
    })).toBe(1050)
  })
})

describe("Phase 1 P0 request status copy", () => {
  it("marks zero-proposal client requests as live while awaiting chef proposals", () => {
    expect(getClientRequestStatusLabel(0)).toBe("Live / Awaiting Chef Proposals")
  })

  it("keeps requests live after proposals arrive", () => {
    expect(getClientRequestStatusLabel(2)).toBe("Live / Proposals Received")
  })
})
