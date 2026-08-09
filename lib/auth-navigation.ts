"use client"

import { signOut } from "next-auth/react"

import { getLoginPathForRole } from "@/lib/role-routes"

export function clearAuthCallbackCookies() {
  document.cookie = "__Secure-next-auth.callback-url=; Path=/; Max-Age=0; SameSite=Lax; Secure"
  document.cookie = "next-auth.callback-url=; Path=/; Max-Age=0; SameSite=Lax"
}

export function signOutForRole(role?: string | null) {
  clearAuthCallbackCookies()
  signOut({ callbackUrl: `${window.location.origin}${getLoginPathForRole(role)}` })
}
