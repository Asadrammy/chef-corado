import { Role } from "@/types"

export const roleLoginPath: Record<Role, string> = {
  [Role.CLIENT]: "/login?role=CLIENT",
  [Role.CHEF]: "/login?role=CHEF",
  [Role.ADMIN]: "/login?role=ADMIN",
}

export const roleDashboardPath: Record<Role, string> = {
  [Role.CLIENT]: "/dashboard/client",
  [Role.CHEF]: "/dashboard/chef",
  [Role.ADMIN]: "/dashboard/admin",
}

export function isKnownRole(role?: string | null): role is Role {
  return role === Role.CLIENT || role === Role.CHEF || role === Role.ADMIN
}

export function getLoginPathForRole(role?: string | null) {
  return isKnownRole(role) ? roleLoginPath[role] : "/login"
}

export function getDashboardPathForRole(role?: string | null) {
  return isKnownRole(role) ? roleDashboardPath[role] : "/dashboard"
}

export function getDashboardRoleForPath(path?: string | null): Role | null {
  if (!path) return null
  if (path === "/dashboard/client" || path.startsWith("/dashboard/client/")) return Role.CLIENT
  if (path === "/dashboard/chef" || path.startsWith("/dashboard/chef/")) return Role.CHEF
  if (path === "/dashboard/admin" || path.startsWith("/dashboard/admin/")) return Role.ADMIN
  return null
}

export function getSafePostLoginRedirect(role: Role, callbackUrl?: string | null) {
  const dashboardPath = getDashboardPathForRole(role)
  const safeCallbackUrl = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : ""
  const callbackDashboardRole = getDashboardRoleForPath(safeCallbackUrl)

  if (callbackDashboardRole && callbackDashboardRole !== role) {
    return dashboardPath
  }

  return safeCallbackUrl || dashboardPath
}
