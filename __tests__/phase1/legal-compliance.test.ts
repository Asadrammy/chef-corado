/// <reference types="jest" />

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    chefProfile: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock("@/lib/error-handler", () => ({
  ApiError: class ApiError extends Error {
    statusCode: number

    constructor(statusCode: number, message: string) {
      super(message)
      this.statusCode = statusCode
    }
  },
}))

import { prisma } from "@/lib/prisma"
import { checkChefCompliance, checkTermsAcceptance } from "@/lib/security/legal-compliance"
import { TERMS_VERSION } from "@/lib/request-options"

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock }
  chefProfile: { findUnique: jest.Mock }
}

describe("Phase 1 legal and chef compliance gates", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("blocks a new client with missing acceptance", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      termsAcceptedAt: null,
      termsVersion: null,
      acceptedVia: null,
    })

    await expect(checkTermsAcceptance("client-1")).resolves.toMatchObject({
      canProceed: false,
      blockingReason: "TERMS_NOT_ACCEPTED",
    })
  })

  it("blocks outdated terms", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      termsAcceptedAt: new Date(),
      termsVersion: "2026-01",
      acceptedVia: "register",
    })

    await expect(checkTermsAcceptance("client-1")).resolves.toMatchObject({
      canProceed: false,
      blockingReason: "TERMS_OUTDATED",
    })
  })

  it("blocks a chef with pending certificate review", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      acceptedVia: "register",
    })
    mockedPrisma.chefProfile.findUnique.mockResolvedValue({
      rightToWorkUkConfirmed: true,
      foodHygieneLevel2Confirmed: true,
      foodHygieneCertificateUrl: "/api/chef/certificates/example.pdf",
      foodHygieneCertificateReviewStatus: "PENDING",
      verificationStatus: "APPROVED",
    })

    await expect(checkChefCompliance("chef-1")).resolves.toMatchObject({
      canProceed: false,
      blockingReason: "FOOD_HYGIENE_CERTIFICATE_APPROVAL_PENDING",
    })
  })

  it("blocks rejected chefs", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      acceptedVia: "register",
    })
    mockedPrisma.chefProfile.findUnique.mockResolvedValue({
      rightToWorkUkConfirmed: true,
      foodHygieneLevel2Confirmed: true,
      foodHygieneCertificateUrl: "/api/chef/certificates/example.pdf",
      foodHygieneCertificateReviewStatus: "APPROVED",
      verificationStatus: "REJECTED",
    })

    await expect(checkChefCompliance("chef-1")).resolves.toMatchObject({
      canProceed: false,
      blockingReason: "CHEF_APPROVAL_REJECTED",
    })
  })

  it("allows an approved compliant chef", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      acceptedVia: "register",
    })
    mockedPrisma.chefProfile.findUnique.mockResolvedValue({
      rightToWorkUkConfirmed: true,
      foodHygieneLevel2Confirmed: true,
      foodHygieneCertificateUrl: "/api/chef/certificates/example.pdf",
      foodHygieneCertificateReviewStatus: "APPROVED",
      verificationStatus: "APPROVED",
    })

    await expect(checkChefCompliance("chef-1")).resolves.toMatchObject({
      canProceed: true,
      blockingReason: undefined,
    })
  })
})
