/// <reference types="jest" />

import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLE_PERMISSIONS,
  adminHasPermission,
  getAdminRolePermissions,
  getVisibleAdminModules,
  parseAdminPermissionOverrides,
} from "@/lib/admin-permissions"

describe("Phase 3 admin RBAC permission matrix", () => {
  it("gives Super Admin every explicit admin permission", () => {
    expect(ADMIN_ROLE_PERMISSIONS.SUPER_ADMIN).toEqual(expect.arrayContaining([...ADMIN_PERMISSIONS]))
  })

  it("prevents support staff from activating pricing or processing payouts", () => {
    expect(adminHasPermission("CUSTOMER_SUPPORT_SPECIALIST", "supportTickets.resolve")).toBe(true)
    expect(adminHasPermission("CUSTOMER_SUPPORT_SPECIALIST", "bookings.modify")).toBe(true)
    expect(adminHasPermission("CUSTOMER_SUPPORT_SPECIALIST", "servicePricing.activate")).toBe(false)
    expect(adminHasPermission("CUSTOMER_SUPPORT_SPECIALIST", "payouts.process")).toBe(false)
  })

  it("prevents finance admins from approving chefs", () => {
    expect(adminHasPermission("FINANCE_BILLING_ADMIN", "finance.view")).toBe(true)
    expect(adminHasPermission("FINANCE_BILLING_ADMIN", "refunds.approve")).toBe(true)
    expect(adminHasPermission("FINANCE_BILLING_ADMIN", "chefs.approve")).toBe(false)
  })

  it("keeps marketing analytics users away from PII and operational modules", () => {
    expect(adminHasPermission("MARKETING_ANALYTICS_ANALYST", "analytics.view")).toBe(true)
    expect(adminHasPermission("MARKETING_ANALYTICS_ANALYST", "pii.view")).toBe(false)
    expect(adminHasPermission("MARKETING_ANALYTICS_ANALYST", "users.view")).toBe(false)
    expect(adminHasPermission("MARKETING_ANALYTICS_ANALYST", "payments.view")).toBe(false)

    const visibleUrls = getVisibleAdminModules("MARKETING_ANALYTICS_ANALYST").map((module) => module.url)
    expect(visibleUrls).toContain("/dashboard/admin/analytics")
    expect(visibleUrls).not.toContain("/dashboard/admin/users")
    expect(visibleUrls).not.toContain("/dashboard/admin/payments")
  })

  it("prevents the client-specified cross-role privilege leaks", () => {
    expect(adminHasPermission("MARKETING_ANALYTICS_ANALYST", "servicePricing.activate")).toBe(false)
    expect(adminHasPermission("CUSTOMER_SUPPORT_SPECIALIST", "servicePricing.edit")).toBe(false)
    expect(adminHasPermission("OPERATIONS_COMPLIANCE_MANAGER", "admins.delete")).toBe(false)
    expect(adminHasPermission("FINANCE_BILLING_ADMIN", "chefs.approve")).toBe(false)
    expect(adminHasPermission("CLIENT", "analytics.view")).toBe(false)
    expect(adminHasPermission("CHEF", "bookings.view")).toBe(false)
    expect(adminHasPermission(null, "admins.delete")).toBe(false)
    expect(getAdminRolePermissions(undefined)).toEqual([])
  })

  it("rejects unknown permission override strings", () => {
    const overrides = JSON.stringify(["refunds.approve", "admins.delete", "system.root"])

    expect(parseAdminPermissionOverrides(overrides)).toEqual(["refunds.approve", "admins.delete"])
    expect(getAdminRolePermissions("CUSTOMER_SUPPORT_SPECIALIST", overrides)).toContain("refunds.approve")
    expect(getAdminRolePermissions("CUSTOMER_SUPPORT_SPECIALIST", overrides)).not.toContain("system.root" as any)
  })
})
