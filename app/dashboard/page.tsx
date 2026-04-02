import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { authOptions, roleDashboardPath } from "@/lib/auth"

const roleHighlights = [
  {
    title: "Client Requests",
    description:
      "Create event requests, track replies from chefs, and manage bookings from a single place.",
    path: "/dashboard/client/create-request",
  },
  {
    title: "Chef Workspace",
    description:
      "Build your profile, scan nearby opportunities, and pitch with proposals tailored to each request.",
    path: "/dashboard/chef",
  },
  {
    title: "Admin Control",
    description:
      "Approve chefs, monitor bookings, and review payments to keep the marketplace running smoothly.",
    path: "/dashboard/admin",
  },
]

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Chef Marketplace Dashboard",
    description: "Role-based dashboards for chefs, clients, and admins in the private chef marketplace.",
  })
}

export default async function Page() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  if (role && session?.user?.id) {
    const rolePath = roleDashboardPath[role]
    if (rolePath) {
      redirect(rolePath)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-300 ease-out hover:-translate-y-1 p-8 border-b border-gray-200/60">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-600 dark:text-gray-300 font-medium">Core system</p>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
          Chef Marketplace Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-4xl">
          This space is being reworked into a private chef marketplace where clients submit requests, chefs respond
          via proposals, and admins oversee approvals and payments. Use the role-specific routes below as we
          build out each section.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roleHighlights.map((card) => (
          <article
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-300 ease-out hover:-translate-y-1 cursor-pointer p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300 font-medium">{card.path}</p>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{card.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{card.description}</p>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium">
              <span>Coming soon</span>
              <span>→</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
