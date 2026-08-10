export const ADMIN_STAFF_ROLES = [
  "SUPER_ADMIN",
  "OPERATIONS_COMPLIANCE_MANAGER",
  "CUSTOMER_SUPPORT_SPECIALIST",
  "FINANCE_BILLING_ADMIN",
  "MARKETING_ANALYTICS_ANALYST",
] as const

export type AdminStaffRole = typeof ADMIN_STAFF_ROLES[number]

export const ADMIN_PERMISSIONS = [
  "users.view",
  "users.edit",
  "users.suspend",
  "users.ban",
  "chefs.review",
  "chefs.approve",
  "certificates.view",
  "certificates.review",
  "backgroundChecks.view",
  "pii.view",
  "requests.view",
  "requests.modify",
  "servicePricing.view",
  "servicePricing.create",
  "servicePricing.edit",
  "servicePricing.activate",
  "serviceAssets.view",
  "serviceAssets.manage",
  "bookings.view",
  "bookings.modify",
  "bookings.cancel",
  "multiDayBookings.manage",
  "fullTimeEnquiries.view",
  "fullTimeEnquiries.assign",
  "fullTimeEnquiries.resolve",
  "communicationLogs.view",
  "supportTickets.view",
  "supportTickets.assign",
  "supportTickets.resolve",
  "notifications.view",
  "disputes.view",
  "disputes.resolve",
  "finance.view",
  "payments.view",
  "refunds.request",
  "refunds.approve",
  "credits.issue",
  "payouts.process",
  "commissions.view",
  "invoices.manage",
  "taxes.view",
  "analytics.view",
  "auditLogs.view",
  "admins.create",
  "admins.edit",
  "admins.delete",
  "platformSettings.manage",
  "brandAssets.manage",
] as const

export type AdminPermission = typeof ADMIN_PERMISSIONS[number]

const superAdminPermissions = [...ADMIN_PERMISSIONS]

export const ADMIN_ROLE_PERMISSIONS: Record<AdminStaffRole, readonly AdminPermission[]> = {
  SUPER_ADMIN: superAdminPermissions,
  OPERATIONS_COMPLIANCE_MANAGER: [
    "users.view",
    "users.edit",
    "users.suspend",
    "users.ban",
    "chefs.review",
    "chefs.approve",
    "certificates.view",
    "certificates.review",
    "backgroundChecks.view",
    "pii.view",
    "requests.view",
    "requests.modify",
    "servicePricing.view",
    "serviceAssets.view",
    "bookings.view",
    "bookings.modify",
    "bookings.cancel",
    "multiDayBookings.manage",
    "fullTimeEnquiries.view",
    "fullTimeEnquiries.assign",
    "fullTimeEnquiries.resolve",
    "communicationLogs.view",
    "supportTickets.view",
    "supportTickets.assign",
    "supportTickets.resolve",
    "notifications.view",
    "disputes.view",
    "disputes.resolve",
    "analytics.view",
    "auditLogs.view",
  ],
  CUSTOMER_SUPPORT_SPECIALIST: [
    "users.view",
    "requests.view",
    "bookings.view",
    "bookings.modify",
    "bookings.cancel",
    "fullTimeEnquiries.view",
    "communicationLogs.view",
    "supportTickets.view",
    "supportTickets.assign",
    "supportTickets.resolve",
    "notifications.view",
    "disputes.view",
    "credits.issue",
  ],
  FINANCE_BILLING_ADMIN: [
    "bookings.view",
    "finance.view",
    "payments.view",
    "refunds.request",
    "refunds.approve",
    "credits.issue",
    "payouts.process",
    "commissions.view",
    "invoices.manage",
    "taxes.view",
    "analytics.view",
    "auditLogs.view",
  ],
  MARKETING_ANALYTICS_ANALYST: [
    "servicePricing.view",
    "serviceAssets.view",
    "analytics.view",
  ],
}

export const ADMIN_ROLE_LABELS: Record<AdminStaffRole, string> = {
  SUPER_ADMIN: "Super Admin",
  OPERATIONS_COMPLIANCE_MANAGER: "Operations & Compliance Manager",
  CUSTOMER_SUPPORT_SPECIALIST: "Customer Support Specialist",
  FINANCE_BILLING_ADMIN: "Finance & Billing Administrator",
  MARKETING_ANALYTICS_ANALYST: "Marketing & Analytics Analyst",
}

export const ADMIN_MODULES = [
  { title: "Overview", url: "/dashboard/admin", permission: "analytics.view" },
  { title: "Users", url: "/dashboard/admin/users", permission: "users.view" },
  { title: "Client Profiles", url: "/dashboard/admin/client-profiles", permission: "users.view" },
  { title: "Chef Verification", url: "/dashboard/admin/chefs", permission: "chefs.review" },
  { title: "Compliance", url: "/dashboard/admin/compliance", permission: "certificates.view" },
  { title: "Background Checks", url: "/dashboard/admin/background-checks", permission: "backgroundChecks.view" },
  { title: "Requests", url: "/dashboard/admin/requests", permission: "requests.view" },
  { title: "Service Pricing", url: "/dashboard/admin/pricing", permission: "servicePricing.view" },
  { title: "Service Assets", url: "/dashboard/admin/service-assets", permission: "serviceAssets.view" },
  { title: "Bookings & Operations", url: "/dashboard/admin/bookings", permission: "bookings.view" },
  { title: "Multi-Day Bookings", url: "/dashboard/admin/multi-day-bookings", permission: "multiDayBookings.manage" },
  { title: "Full-Time Enquiries", url: "/dashboard/admin/full-time-enquiries", permission: "fullTimeEnquiries.view" },
  { title: "Calendar", url: "/dashboard/admin/calendar", permission: "bookings.view" },
  { title: "Disputes", url: "/dashboard/admin/disputes", permission: "disputes.view" },
  { title: "Refunds & Credits", url: "/dashboard/admin/refunds", permission: "refunds.request" },
  { title: "Finance", url: "/dashboard/admin/finance", permission: "finance.view" },
  { title: "Payments", url: "/dashboard/admin/payments", permission: "payments.view" },
  { title: "Payouts", url: "/dashboard/admin/payouts", permission: "payouts.process" },
  { title: "Commissions", url: "/dashboard/admin/commissions", permission: "commissions.view" },
  { title: "Invoices", url: "/dashboard/admin/invoices", permission: "invoices.manage" },
  { title: "Analytics", url: "/dashboard/admin/analytics", permission: "analytics.view" },
  { title: "Support Tickets", url: "/dashboard/admin/support-tickets", permission: "supportTickets.view" },
  { title: "Notifications", url: "/dashboard/admin/notifications", permission: "notifications.view" },
  { title: "Staff & Permissions", url: "/dashboard/admin/staff", permission: "admins.edit" },
  { title: "Audit Logs", url: "/dashboard/admin/audit-logs", permission: "auditLogs.view" },
  { title: "Settings", url: "/dashboard/admin/settings", permission: "platformSettings.manage" },
] as const satisfies readonly { title: string; url: string; permission: AdminPermission }[]

export const ADMIN_MODULE_GROUPS = [
  {
    label: "Overview",
    modules: ["Overview"],
  },
  {
    label: "Operations",
    modules: ["Requests", "Bookings & Operations", "Multi-Day Bookings", "Full-Time Enquiries", "Calendar"],
  },
  {
    label: "Users & Compliance",
    modules: ["Users", "Client Profiles", "Chef Verification", "Compliance", "Background Checks"],
  },
  {
    label: "Support & Trust",
    modules: ["Support Tickets", "Notifications", "Disputes"],
  },
  {
    label: "Finance",
    modules: ["Payments", "Refunds & Credits", "Payouts", "Commissions", "Invoices", "Service Pricing", "Finance"],
  },
  {
    label: "Insights",
    modules: ["Analytics"],
  },
  {
    label: "Platform",
    modules: ["Service Assets", "Staff & Permissions", "Audit Logs", "Settings"],
  },
] as const

export function isAdminStaffRole(value?: string | null): value is AdminStaffRole {
  return ADMIN_STAFF_ROLES.includes(value as AdminStaffRole)
}

export function isAdminPermission(value?: string | null): value is AdminPermission {
  return ADMIN_PERMISSIONS.includes(value as AdminPermission)
}

export function parseAdminPermissionOverrides(raw?: string | null) {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isAdminPermission)
  } catch {
    return []
  }
}

export function getAdminRolePermissions(role?: string | null, rawOverrides?: string | null) {
  const base = isAdminStaffRole(role) ? ADMIN_ROLE_PERMISSIONS[role] : []
  return Array.from(new Set([...base, ...parseAdminPermissionOverrides(rawOverrides)]))
}

export function adminHasPermission(role: string | null | undefined, permission: AdminPermission, rawOverrides?: string | null) {
  return getAdminRolePermissions(role, rawOverrides).includes(permission)
}

export function getVisibleAdminModules(role?: string | null, rawOverrides?: string | null) {
  const permissions = getAdminRolePermissions(role, rawOverrides)
  return ADMIN_MODULES.filter((module) => permissions.includes(module.permission))
}

export function getVisibleAdminModuleGroups(role?: string | null, rawOverrides?: string | null) {
  const visibleModules = getVisibleAdminModules(role, rawOverrides)
  return ADMIN_MODULE_GROUPS.map((group) => ({
    label: group.label,
    modules: group.modules
      .map((title) => visibleModules.find((module) => module.title === title))
      .filter((module): module is typeof visibleModules[number] => Boolean(module)),
  })).filter((group) => group.modules.length > 0)
}
