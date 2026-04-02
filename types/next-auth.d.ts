import { Role } from "./index"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      role?: Role | null
      id?: string | null
    }
  }

  interface User {
    id: string
    role?: Role | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role | null
    sub?: string
  }
}
