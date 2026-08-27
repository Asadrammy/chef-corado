import { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { isLocalDemoSessionUser } from "@/lib/auth"
import { generateMeta } from "@/lib/utils"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { localDemoClientRequestDetail } from "@/lib/local-demo-data"
import { RequestWizardForm, type RequestWizardInitialRequest } from "@/components/request-wizard-form"
import { RequestNotesEditor } from "@/components/request-notes-editor"
import { canEditRequestNotes } from "@/lib/request-lifecycle"

export const metadata: Metadata = generateMeta({
  title: "Edit Request",
  description: "Update your request before chefs respond.",
})

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  const { requestId } = await params
  let request: RequestWizardInitialRequest | null = null
  let requestMeta: { requestMode: string; proposals: Array<{ status: string | null }> } | null = null

  if (isLocalDemoSessionUser(session.user.id, session.user.email)) {
    const demoRequest = localDemoClientRequestDetail(requestId) as any
    if (demoRequest && demoRequest.requestMode !== "MULTI_DAY") {
      requestMeta = {
        requestMode: demoRequest.requestMode,
        proposals: demoRequest.proposals ?? [],
      }
      request = {
        id: demoRequest.id,
        title: demoRequest.title,
        eventType: demoRequest.eventType,
        serviceType: demoRequest.serviceType,
        serviceTier: demoRequest.serviceTypeLabel ?? undefined,
        cuisineTypes: demoRequest.cuisineTypes,
        dietaryRequirements: demoRequest.dietaryRequirements,
        serviceSpecificAnswers: demoRequest.serviceSpecificAnswers,
        eventDate: demoRequest.eventDate,
        eventTime: demoRequest.eventTime,
        location: demoRequest.location,
        countryCode: demoRequest.countryCode,
        guestCount: demoRequest.guestCount,
        adultCount: demoRequest.adultCount ?? demoRequest.guestCount,
        childrenUnder10: demoRequest.childrenUnder10 ?? 0,
        budget: demoRequest.budget,
        details: demoRequest.details,
      }
    }
  } else {
    try {
      const dbRequest = await prisma.request.findFirst({
        where: {
          id: requestId,
          clientId: session.user.id,
        },
        select: {
          id: true,
          title: true,
          requestMode: true,
          eventType: true,
          serviceType: true,
          serviceTier: true,
          cuisineTypes: true,
          dietaryRequirements: true,
          serviceSpecificAnswers: true,
          eventDate: true,
          eventTime: true,
          location: true,
          countryCode: true,
          guestCount: true,
          adultCount: true,
          childrenUnder10: true,
          budget: true,
          details: true,
          proposals: {
            select: {
              status: true,
            },
          },
          _count: {
            select: {
              proposals: true,
            },
          },
        },
      })

      if (dbRequest) {
        requestMeta = {
          requestMode: dbRequest.requestMode,
          proposals: dbRequest.proposals,
        }
        if (dbRequest.requestMode === "STANDARD") {
          request = {
            id: dbRequest.id,
            title: dbRequest.title,
            eventType: dbRequest.eventType,
            serviceType: dbRequest.serviceType,
            serviceTier: dbRequest.serviceTier,
            cuisineTypes: dbRequest.cuisineTypes,
            dietaryRequirements: dbRequest.dietaryRequirements,
            serviceSpecificAnswers: dbRequest.serviceSpecificAnswers,
            eventDate: dbRequest.eventDate,
            eventTime: dbRequest.eventTime,
            location: dbRequest.location,
            countryCode: dbRequest.countryCode,
            guestCount: dbRequest.guestCount,
            adultCount: dbRequest.adultCount,
            childrenUnder10: dbRequest.childrenUnder10,
            budget: dbRequest.budget,
            details: dbRequest.details,
          }
        }
      }
    } catch (error) {
      if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
        const demoRequest = localDemoClientRequestDetail(requestId) as any
        if (demoRequest) {
          requestMeta = {
            requestMode: demoRequest.requestMode,
            proposals: demoRequest.proposals ?? [],
          }
          request = {
            id: demoRequest.id,
            title: demoRequest.title,
            eventType: demoRequest.eventType,
            serviceType: demoRequest.serviceType,
            serviceTier: demoRequest.serviceTypeLabel ?? undefined,
            cuisineTypes: demoRequest.cuisineTypes,
            dietaryRequirements: demoRequest.dietaryRequirements,
            serviceSpecificAnswers: demoRequest.serviceSpecificAnswers,
            eventDate: demoRequest.eventDate,
            eventTime: demoRequest.eventTime,
            location: demoRequest.location,
            countryCode: demoRequest.countryCode,
            guestCount: demoRequest.guestCount,
            adultCount: demoRequest.adultCount ?? demoRequest.guestCount,
            childrenUnder10: demoRequest.childrenUnder10 ?? 0,
            budget: demoRequest.budget,
            details: demoRequest.details,
          }
        }
      } else {
        throw error
      }
    }
  }

  if (!request) {
    notFound()
  }

  const hasAnyProposal = (requestMeta?.proposals.length ?? 0) > 0
  const notesOnlyMode = hasAnyProposal && requestMeta != null && canEditRequestNotes(requestMeta.requestMode, requestMeta.proposals)
  const hasLockedProposal = requestMeta?.proposals.some((proposal) => ["ACCEPTED_PENDING_PAYMENT", "ACCEPTED", "BOOKED"].includes(proposal.status ?? "")) ?? false

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-1 py-2 md:px-2 md:py-4">
      <div className="flex flex-col gap-3 border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Edit request
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Update your request details before chefs have responded.
          </p>
        </div>
      </div>

      {hasLockedProposal ? (
        <div className="rounded-[28px] border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          This request already has a locked commercial proposal. Notes and changes now need to go through support so quoted terms stay intact.
        </div>
      ) : notesOnlyMode ? (
        <RequestNotesEditor request={request} />
      ) : (
        <RequestWizardForm mode="edit" initialRequest={request} />
      )}
    </div>
  )
}
