import { Role } from "@/types"

const mockListProposalsForClient = jest.fn()
const mockListProposalsForClientLegacy = jest.fn()
const mockListProposalsForChef = jest.fn()
const mockListProposalsForChefLegacy = jest.fn()
const mockFindChefProfileByUserId = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {},
}))

jest.mock("@/lib/repositories/proposal-repository", () => ({
  proposalRepository: {
    findChefProfileByUserId: mockFindChefProfileByUserId,
    listProposalsForClient: mockListProposalsForClient,
    listProposalsForClientLegacy: mockListProposalsForClientLegacy,
    listProposalsForChef: mockListProposalsForChef,
    listProposalsForChefLegacy: mockListProposalsForChefLegacy,
  },
}))

jest.mock("@/lib/email", () => ({
  emailTemplates: {},
  sendPreferenceAwareEmail: jest.fn(),
}))

jest.mock("@/lib/notifications", () => ({
  triggerProposalAcceptedNotification: jest.fn(),
  triggerProposalNotification: jest.fn(),
  triggerProposalRejectedNotification: jest.fn(),
}))

jest.mock("@/lib/services/pricing-rule-service", () => ({
  assertProposalMeetsActivePricingRule: jest.fn(),
}))

jest.mock("@/lib/security/moderation-guard", () => ({
  enforceUserModeration: jest.fn(),
  enforceChefModeration: jest.fn(),
}))

jest.mock("@/lib/security/legal-compliance", () => ({
  enforceChefCompliance: jest.fn(),
}))

jest.mock("@/lib/security/communication-policy", () => ({
  validateMessageContent: jest.fn(),
}))

jest.mock("@/lib/services/quote-limit-service", () => ({
  assertRequestCanReceiveQuote: jest.fn(),
}))

jest.mock("@/lib/services/market-configuration-service", () => ({
  marketConfigurationService: {
    assertBookingMarketEnabled: jest.fn(),
  },
}))

describe("proposal list legacy schema fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns client proposals without crashing when ProposalLineItem is not migrated yet", async () => {
    mockListProposalsForClient.mockRejectedValueOnce(
      new Error("The table `public.ProposalLineItem` does not exist in the current database. P2021 TableDoesNotExist")
    )
    mockListProposalsForClientLegacy.mockResolvedValueOnce([
      {
        id: "proposal-1",
        chef: {
          user: { id: "chef-user-1", name: "Chef One" },
          reviews: [{ rating: 5 }, { rating: 3 }],
          profileImage: null,
          userId: "chef-user-1",
        },
      },
    ])

    const { proposalService } = await import("@/lib/services/proposal-service")
    const proposals = await proposalService.listProposals("client-1", Role.CLIENT)

    expect(mockListProposalsForClientLegacy).toHaveBeenCalledWith("client-1")
    expect(proposals[0]).toMatchObject({
      id: "proposal-1",
      lineItems: [],
      chef: {
        name: "Chef One",
        rating: 4,
        reviewCount: 2,
      },
    })
  })

  it("returns chef proposals without crashing when ProposalLineItem is not migrated yet", async () => {
    mockFindChefProfileByUserId.mockResolvedValueOnce({ id: "chef-profile-1" })
    mockListProposalsForChef.mockRejectedValueOnce(
      new Error("The table `public.ProposalLineItem` does not exist in the current database. P2021 TableDoesNotExist")
    )
    mockListProposalsForChefLegacy.mockResolvedValueOnce([
      {
        id: "proposal-2",
        chef: {
          user: { id: "chef-user-1", name: "Chef One" },
          userId: "chef-user-1",
        },
      },
    ])

    const { proposalService } = await import("@/lib/services/proposal-service")
    const proposals = await proposalService.listProposals("chef-user-1", Role.CHEF)

    expect(mockListProposalsForChefLegacy).toHaveBeenCalledWith("chef-profile-1")
    expect(proposals[0]).toMatchObject({
      id: "proposal-2",
      lineItems: [],
      chef: {
        name: "Chef One",
        userId: "chef-user-1",
      },
    })
  })
})
