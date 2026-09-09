import { readFileSync } from "fs"

describe("Phase 1 P0 source contracts", () => {
  it("marks public and authenticated multi-day draft handoff budgets as total-event budgets", () => {
    const publicWizard = readFileSync("components/public/local-chef-discovery-wizard.tsx", "utf8")
    const authenticatedWizard = readFileSync("components/request-wizard-form.tsx", "utf8")
    const multiDayForm = readFileSync("components/multi-day-chef-hire-form.tsx", "utf8")

    expect(publicWizard).toContain('budgetMode: "TOTAL_EVENT"')
    expect(publicWizard).toContain("totalBudget: budget.trim()")
    expect(authenticatedWizard).toContain('budgetMode: "TOTAL_EVENT"')
    expect(authenticatedWizard).toContain("totalBudget: nextData.budget")
    expect(multiDayForm).toContain("restoreMultiDayBudgetDraft")
    expect(multiDayForm).not.toContain("setDefaultDailyBudget(String(draft.budget))")
    expect(multiDayForm).not.toContain("dailyBudget: draft.budget != null ? String(draft.budget)")
  })

  it("emits delayed broader-access events for both standard and multi-day requests", () => {
    const requestService = readFileSync("lib/services/request-service.ts", "utf8")
    const eventCount = (requestService.match(/eventType: "REQUEST_BROADER_ACCESS_NOTIFY"/g) ?? []).length

    expect(eventCount).toBeGreaterThanOrEqual(2)
    expect(requestService).toContain("dedupeKey: `REQUEST_BROADER_ACCESS_NOTIFY:${created.id}`")
    expect(requestService).toContain("nextRunAt: new Date(created.createdAt.getTime() + EARLY_ACCESS_WINDOW_MS)")
  })

  it("keeps dashboard request visibility independent of email and queue delivery", () => {
    const chefRequestsPage = readFileSync("app/dashboard/chef/requests/page.tsx", "utf8")

    expect(chefRequestsPage).toContain("evaluateChefRequestAccessForRecords")
    expect(chefRequestsPage).toContain("buildChefRequestVisibilityDiagnosticSummary")
    expect(chefRequestsPage).not.toContain("sendPreferenceAwareEmail")
    expect(chefRequestsPage).not.toContain("processPendingEvents")
  })

  it("uses specialty mapping in public chef search service filters", () => {
    const searchRoute = readFileSync("app/api/chefs/search/route.ts", "utf8")

    expect(searchRoute).toContain("specialtyValuesForServiceType")
    expect(searchRoute).toContain('THREE_COURSE_MEAL: ["PRIVATE_DINING"]')
    expect(searchRoute).toContain("{ specialties: { contains: specialty")
  })
})
