"use client"

import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { signOutForRole } from "@/lib/auth-navigation"

type RoleAwareSignOutButtonProps = {
  role?: string | null
  children?: ReactNode
}

export function RoleAwareSignOutButton({ role, children = "Sign Out" }: RoleAwareSignOutButtonProps) {
  return (
    <Button className="w-full" type="button" onClick={() => signOutForRole(role)}>
      {children}
    </Button>
  )
}
