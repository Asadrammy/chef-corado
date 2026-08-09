import { requireAdminPageAccess } from "@/lib/admin-rbac"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPageAccess()
  return children
}
