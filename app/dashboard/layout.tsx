import { DashboardShell } from "@/components/dashboard-shell"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import Providers from "@/components/providers"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { INSURANCE_VERSION, isCurrentInsuranceVersion, isCurrentTermsVersion, TERMS_VERSION } from "@/lib/request-options"

// Prevent static generation
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isBanned: true,
      role: true,
      termsVersion: true,
      termsAcceptedAt: true,
      chefProfile: {
        select: {
          insuranceAcknowledgedAt: true,
          insuranceVersion: true,
        },
      },
    },
  })

  if (user?.isBanned) {
    redirect("/login?banned=1")
  }

  const chefInsuranceNeedsAttention = user?.role === "CHEF"
    ? !user.chefProfile?.insuranceAcknowledgedAt || !isCurrentInsuranceVersion(user.chefProfile?.insuranceVersion)
    : false

  const legalNotice = {
    needsAttention: !isCurrentTermsVersion(user?.termsVersion) || !user?.termsAcceptedAt || chefInsuranceNeedsAttention,
    chefInsuranceNeedsAttention,
    termsVersion: user?.termsVersion ?? TERMS_VERSION,
    insuranceVersion: user?.chefProfile?.insuranceVersion ?? INSURANCE_VERSION,
  }

  return (
    <Providers>
      <DashboardShell legalNotice={legalNotice}>{children}</DashboardShell>
    </Providers>
  )
}
