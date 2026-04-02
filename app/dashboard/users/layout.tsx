import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Users Management",
  description: "Manage users in the chef marketplace platform",
}

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
