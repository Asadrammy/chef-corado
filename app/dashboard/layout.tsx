import { DashboardShell } from "@/components/dashboard-shell"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import Providers from "@/components/providers"

import { authOptions, isLocalDemoSessionUser } from "@/lib/auth"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { isCurrentTermsVersion, TERMS_VERSION } from "@/lib/request-options"

// Prevent static generation
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  if (isLocalDemoSessionUser(session.user.id, session.user.email)) {
    const legalNotice = {
      needsAttention: Boolean(session.user.needsTermsAcceptance || session.user.needsChefCompliance),
      chefComplianceNeedsAttention: Boolean(session.user.needsChefCompliance),
      termsVersion: TERMS_VERSION,
    }

    return (
      <Providers>
        <DashboardShell legalNotice={legalNotice}>{children}</DashboardShell>
      </Providers>
    )
  }

  let user

  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isBanned: true,
        role: true,
        termsVersion: true,
        termsAcceptedAt: true,
        chefProfile: {
          select: {
            rightToWorkUkConfirmed: true,
            foodHygieneLevel2Confirmed: true,
            foodHygieneCertificateUrl: true,
            foodHygieneCertificateReviewStatus: true,
            verificationStatus: true,
            isApproved: true,
          },
        },
      },
    })
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      const legalNotice = {
        needsAttention: Boolean(session.user.needsTermsAcceptance || session.user.needsChefCompliance),
        chefComplianceNeedsAttention: Boolean(session.user.needsChefCompliance),
        termsVersion: TERMS_VERSION,
      }

      return (
        <Providers>
          <DashboardShell legalNotice={legalNotice}>{children}</DashboardShell>
        </Providers>
      )
    }

    throw error
  }

  if (user?.isBanned) {
    redirect("/login?banned=1")
  }

  const chefComplianceNeedsAttention = user?.role === "CHEF"
    ? !user.chefProfile?.rightToWorkUkConfirmed ||
      !user.chefProfile?.foodHygieneLevel2Confirmed ||
      !user.chefProfile?.foodHygieneCertificateUrl ||
      user.chefProfile?.foodHygieneCertificateReviewStatus !== "APPROVED" ||
      user.chefProfile?.verificationStatus !== "APPROVED" ||
      !user.chefProfile?.isApproved
    : false

  const legalNotice = {
    needsAttention: !isCurrentTermsVersion(user?.termsVersion) || !user?.termsAcceptedAt || chefComplianceNeedsAttention,
    chefComplianceNeedsAttention,
    termsVersion: user?.termsVersion ?? TERMS_VERSION,
  }

  return (
    <Providers>
      <DashboardShell legalNotice={legalNotice}>{children}</DashboardShell>
    </Providers>
  )
}
