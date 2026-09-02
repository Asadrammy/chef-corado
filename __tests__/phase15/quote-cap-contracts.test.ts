import { readFileSync } from "fs"
import path from "path"

let tx: any

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((callback, options) => {
      tx.options = options
      return callback(tx)
    }),
  },
}))

import { proposalRepository } from "@/lib/repositories/proposal-repository"

function validProposalInput() {
  return {
    requestId: "request-1",
    chefId: "chef-1",
    price: 100,
    currency: "GBP",
    message: "I can help.",
  }
}

describe("proposal quote cap contracts", () => {
  beforeEach(() => {
    tx = {
      options: null,
      proposal: {
        count: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: "proposal-1" }),
      },
    }
  })

  it.each([0, 9])("allows proposal count %i before creation", async (count) => {
    tx.proposal.count.mockResolvedValue(count)

    await expect(proposalRepository.createProposalAtomically(validProposalInput())).resolves.toEqual({ id: "proposal-1" })

    expect(tx.proposal.create).toHaveBeenCalledTimes(1)
  })

  it("rejects the 11th proposal when 10 already exist", async () => {
    tx.proposal.count.mockResolvedValue(10)

    await expect(proposalRepository.createProposalAtomically(validProposalInput())).rejects.toThrow("REQUEST_PROPOSAL_LIMIT_REACHED")
    expect(tx.proposal.create).not.toHaveBeenCalled()
  })

  it("uses serializable transactions to reduce parallel submit races", async () => {
    tx.proposal.count.mockResolvedValue(9)

    await proposalRepository.createProposalAtomically(validProposalInput())

    expect(tx.options).toEqual(expect.objectContaining({ isolationLevel: "Serializable" }))
  })

  it("keeps duplicate same-chef proposals blocked by the schema unique constraint", () => {
    const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8")

    expect(schema).toContain("@@unique([requestId, chefId])")
  })

  it("does not depend on the obsolete Offer model for quote counting", () => {
    const source = readFileSync(path.join(process.cwd(), "lib/services/quote-limit-service.ts"), "utf8")

    expect(source).not.toContain("prisma.offer")
    expect(source).toContain("prisma.proposal.count")
  })
})
