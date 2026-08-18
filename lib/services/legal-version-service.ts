import { prisma } from "@/lib/prisma"

export const LEGAL_DOCUMENT_STATUSES = ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "RETIRED"] as const
export type LegalDocumentStatus = typeof LEGAL_DOCUMENT_STATUSES[number]

export const LEGAL_DOCUMENT_TYPES = ["TERMS", "PRIVACY_POLICY"] as const
export type LegalDocumentType = typeof LEGAL_DOCUMENT_TYPES[number]

const CLIENT_CONFIRMED_ACTIVE_DOCUMENTS = [
  {
    id: "legal-terms-us-2026-08-confirmed-published",
    documentType: "TERMS",
    countryCode: "US",
    version: "2026-08-US-DOCX",
    status: "ACTIVE",
    effectiveFrom: new Date("2026-08-13T00:00:00.000Z"),
    effectiveTo: null,
    sourceName: "CHEFACHEF TERMS AND CONDITIONS USA USERS.docx",
    checksum: null,
    notes: "Client confirmed on 2026-08-12 that USA Terms may remain published while USA marketplace stays inactive for bookings/payments.",
    createdBy: "CLIENT_CLARIFICATION",
    updatedBy: "CLIENT_CLARIFICATION",
    createdAt: new Date("2026-08-13T00:00:00.000Z"),
    updatedAt: new Date("2026-08-13T00:00:00.000Z"),
  },
  {
    id: "legal-privacy-2026-08-confirmed-published",
    documentType: "PRIVACY_POLICY",
    countryCode: null,
    version: "2026-08-PRIVACY-DOCX",
    status: "ACTIVE",
    effectiveFrom: new Date("2026-08-13T00:00:00.000Z"),
    effectiveTo: null,
    sourceName: "CHEFACHEF PRIVACY POLICY.docx",
    checksum: null,
    notes: "Client confirmed the current support email and secure London, UK data storage wording.",
    createdBy: "CLIENT_CLARIFICATION",
    updatedBy: "CLIENT_CLARIFICATION",
    createdAt: new Date("2026-08-13T00:00:00.000Z"),
    updatedAt: new Date("2026-08-13T00:00:00.000Z"),
  },
] as const

function getClientConfirmedActiveDocument(input: {
  documentType: LegalDocumentType
  countryCode?: string | null
  at: Date
}) {
  return CLIENT_CONFIRMED_ACTIVE_DOCUMENTS.find((document) =>
    document.documentType === input.documentType &&
    document.countryCode === (input.countryCode ?? null) &&
    isLegalDocumentActive({ status: document.status, effectiveFrom: document.effectiveFrom, effectiveTo: document.effectiveTo, at: input.at })
  ) ?? null
}

function isClientConfirmedFallbackDocument(document: { id: string }) {
  return document.id.endsWith("-confirmed-published")
}

function isMissingLegalTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    (message.includes("LegalDocumentVersion") || message.includes("UserLegalAcceptance")) &&
    (message.includes("does not exist") || message.includes("not exist") || message.includes("P2021") || message.includes("relation"))
  )
}

export function isLegalDocumentActive(input: {
  status: string
  effectiveFrom?: Date | null
  effectiveTo?: Date | null
  at?: Date
}) {
  const at = input.at ?? new Date()
  return input.status === "ACTIVE" &&
    (!input.effectiveFrom || input.effectiveFrom <= at) &&
    (!input.effectiveTo || input.effectiveTo > at)
}

export const legalVersionService = {
  async getCurrentDocument(input: {
    documentType: LegalDocumentType
    countryCode?: string | null
    at?: Date
  }) {
    const at = input.at ?? new Date()
    try {
      const document = await prisma.legalDocumentVersion.findFirst({
        where: {
          documentType: input.documentType,
          countryCode: input.countryCode ?? null,
          status: "ACTIVE",
          OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }],
          AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] }],
        },
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
      })
      return document ?? getClientConfirmedActiveDocument({
        documentType: input.documentType,
        countryCode: input.countryCode,
        at,
      })
    } catch (error) {
      if (isMissingLegalTable(error)) {
        return getClientConfirmedActiveDocument({
          documentType: input.documentType,
          countryCode: input.countryCode,
          at,
        })
      }
      throw error
    }
  },

  async recordActiveAcceptances(input: {
    userId: string
    role: string
    countryCode?: string | null
    acceptedVia: string
    ipAddress?: string | null
    userAgent?: string | null
  }) {
    try {
      const documents = await Promise.all([
        this.getCurrentDocument({ documentType: "TERMS", countryCode: input.countryCode ?? null }),
        this.getCurrentDocument({ documentType: "PRIVACY_POLICY", countryCode: null }),
      ])

      const activeDocuments = documents.filter((document): document is NonNullable<typeof document> => {
        if (!document) return false
        return !isClientConfirmedFallbackDocument(document)
      })
      if (activeDocuments.length === 0) {
        return []
      }

      return await prisma.$transaction(
        activeDocuments.map((document) =>
          prisma.userLegalAcceptance.upsert({
            where: {
              userId_documentVersionId: {
                userId: input.userId,
                documentVersionId: document.id,
              },
            },
            update: {
              role: input.role,
              countryCode: input.countryCode ?? null,
              acceptedVia: input.acceptedVia,
              acceptedAt: new Date(),
              ipAddress: input.ipAddress ?? null,
              userAgent: input.userAgent ?? null,
            },
            create: {
              userId: input.userId,
              documentVersionId: document.id,
              role: input.role,
              countryCode: input.countryCode ?? null,
              acceptedVia: input.acceptedVia,
              ipAddress: input.ipAddress ?? null,
              userAgent: input.userAgent ?? null,
            },
          })
        )
      )
    } catch (error) {
      if (isMissingLegalTable(error)) return []
      throw error
    }
  },
}
