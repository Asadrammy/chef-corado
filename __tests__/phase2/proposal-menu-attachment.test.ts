/// <reference types="jest" />

jest.mock("@/lib/repositories/proposal-repository", () => ({
  proposalRepository: {
    findChefProfileByUserId: jest.fn(),
    findOwnedMenu: jest.fn(),
    findRequestWithClient: jest.fn(),
    createProposalAtomically: jest.fn(),
  },
}))

jest.mock("@/lib/email", () => ({
  emailTemplates: {
    newProposal: jest.fn(() => "<p>proposal</p>"),
  },
  sendPreferenceAwareEmail: jest.fn(() => Promise.resolve()),
}))

jest.mock("@/lib/notifications", () => ({
  triggerProposalAcceptedNotification: jest.fn(),
  triggerProposalNotification: jest.fn(() => Promise.resolve()),
  triggerProposalRejectedNotification: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {},
}))

jest.mock("@/lib/security/moderation-guard", () => ({
  enforceUserModeration: jest.fn(() => Promise.resolve()),
  enforceChefModeration: jest.fn(() => Promise.resolve()),
}))

jest.mock("@/lib/security/legal-compliance", () => ({
  enforceChefCompliance: jest.fn(() => Promise.resolve()),
}))

jest.mock("@/lib/security/communication-policy", () => ({
  validateMessageContent: jest.fn(),
}))

jest.mock("@/lib/services/quote-limit-service", () => ({
  assertRequestCanReceiveQuote: jest.fn(() => Promise.resolve()),
}))

import { proposalRepository } from "@/lib/repositories/proposal-repository"
import { proposalService } from "@/lib/services/proposal-service"

const repo = proposalRepository as unknown as Record<string, jest.Mock>

describe("Phase 2 proposal menu attachment", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    repo.findChefProfileByUserId.mockResolvedValue({ id: "chef-profile-1" })
    repo.findRequestWithClient.mockResolvedValue({
      id: "request-1",
      title: "Dinner",
      currency: "GBP",
      clientId: "client-1",
      client: {
        id: "client-1",
        name: "Client",
        email: "client@example.com",
      },
    })
    repo.createProposalAtomically.mockResolvedValue({ id: "proposal-1" })
  })

  it("persists an owned optional menu on proposal creation", async () => {
    repo.findOwnedMenu.mockResolvedValue({ id: "menu-1" })

    await proposalService.createProposal("chef-user-1", "Chef", {
      requestId: "request-1",
      price: 250,
      message: "A tailored seasonal menu for your dinner.",
      menuId: "menu-1",
    })

    expect(repo.findOwnedMenu).toHaveBeenCalledWith("menu-1", "chef-profile-1")
    expect(repo.createProposalAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "request-1",
        chefId: "chef-profile-1",
        currency: "GBP",
        menuId: "menu-1",
      })
    )
  })

  it("allows proposal creation without a menu", async () => {
    await proposalService.createProposal("chef-user-1", "Chef", {
      requestId: "request-1",
      price: 250,
      message: "A tailored seasonal menu for your dinner.",
    })

    expect(repo.findOwnedMenu).not.toHaveBeenCalled()
    expect(repo.createProposalAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        menuId: null,
      })
    )
  })

  it("rejects a menu that does not belong to the chef profile", async () => {
    repo.findOwnedMenu.mockResolvedValue(null)

    await expect(
      proposalService.createProposal("chef-user-1", "Chef", {
        requestId: "request-1",
        price: 250,
        message: "A tailored seasonal menu for your dinner.",
        menuId: "menu-other",
      })
    ).rejects.toThrow("MENU_NOT_FOUND_OR_FORBIDDEN")

    expect(repo.createProposalAtomically).not.toHaveBeenCalled()
  })
})
