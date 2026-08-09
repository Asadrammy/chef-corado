import type { AdminAccessContext } from "@/lib/admin-rbac"

export function canViewPii(access?: Pick<AdminAccessContext, "permissions"> | null) {
  return Boolean(access?.permissions.includes("pii.view"))
}

export function maskEmailForAdmin(email?: string | null, access?: Pick<AdminAccessContext, "permissions"> | null) {
  if (!email) return "Not recorded"
  if (canViewPii(access)) return email
  const [name, domain] = email.split("@")
  if (!name || !domain) return "Masked"
  return `${name.slice(0, 2)}***@${domain}`
}

export function maskTextForAdmin(value?: string | null, access?: Pick<AdminAccessContext, "permissions"> | null) {
  if (!value) return "Not recorded"
  if (canViewPii(access)) return value
  return "Restricted"
}

export function formatAdminDate(value?: Date | string | null) {
  if (!value) return "Not recorded"
  return new Date(value).toLocaleString()
}

export function formatShortDate(value?: Date | string | null) {
  if (!value) return "Not recorded"
  return new Date(value).toLocaleDateString()
}

export function parseJsonList(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}
