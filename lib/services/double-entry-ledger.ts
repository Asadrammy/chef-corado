import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/monitoring/logger'

/**
 * Double-Entry Ledger System
 * 
 * Implements fintech-grade accounting:
 * - Every transaction has debit and credit entries
 * - Entries always balance to zero
 * - Full audit trail
 * - Account reconciliation
 */

export enum AccountType {
  CLIENT_WALLET = 'CLIENT_WALLET',
  CHEF_WALLET = 'CHEF_WALLET',
  PLATFORM_ESCROW = 'PLATFORM_ESCROW',
  PLATFORM_FEES = 'PLATFORM_FEES',
  STRIPE_HOLDING = 'STRIPE_HOLDING',
}

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum TransactionType {
  PAYMENT_CAPTURE = 'PAYMENT_CAPTURE',
  PAYMENT_HOLD = 'PAYMENT_HOLD',
  PAYMENT_RELEASE = 'PAYMENT_RELEASE',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
  COMMISSION = 'COMMISSION',
  ADJUSTMENT = 'ADJUSTMENT',
}

interface LedgerEntry {
  accountId: string
  accountType: AccountType
  entryType: EntryType
  amount: number
  description: string
}

interface DoubleEntryTransaction {
  transactionId: string
  transactionType: TransactionType
  timestamp: Date
  entries: LedgerEntry[]
  metadata?: Record<string, any>
}

export class DoubleEntryLedger {
  /**
   * Record a double-entry transaction
   * Ensures debit and credit entries balance
   */
  async recordTransaction(transaction: DoubleEntryTransaction): Promise<void> {
    logger.info('[LEDGER] Recording double-entry transaction', {
      transactionId: transaction.transactionId,
      type: transaction.transactionType,
      entries: transaction.entries.length,
    })

    // Validate entries balance
    this.validateBalance(transaction.entries)

    // Record in the active Ledger table. Accounting-specific fields are stored
    // in metadata because the marketplace schema uses a general ledger model.
    await prisma.$transaction(async (tx) => {
      for (const entry of transaction.entries) {
        await tx.ledger.create({
          data: {
            transactionType: transaction.transactionType,
            amount: entry.amount,
            currency: String(transaction.metadata?.currency || 'GBP'),
            fromAccount: entry.entryType === EntryType.DEBIT ? entry.accountId : null,
            toAccount: entry.entryType === EntryType.CREDIT ? entry.accountId : null,
            description: entry.description,
            metadata: JSON.stringify({
              ...transaction.metadata,
              doubleEntryTransactionId: transaction.transactionId,
              accountId: entry.accountId,
              accountType: entry.accountType,
              entryType: entry.entryType,
              timestamp: transaction.timestamp.toISOString(),
            }),
            createdBy: 'DOUBLE_ENTRY_LEDGER',
          },
        })
      }
    })

    logger.info('[LEDGER] Transaction recorded successfully', {
      transactionId: transaction.transactionId,
    })
  }

  /**
   * Record payment capture (client wallet → platform escrow)
   */
  async recordPaymentCapture(
    paymentId: string,
    clientId: string,
    amount: number,
    stripePaymentIntentId: string
  ): Promise<void> {
    const transaction: DoubleEntryTransaction = {
      transactionId: paymentId,
      transactionType: TransactionType.PAYMENT_CAPTURE,
      timestamp: new Date(),
      entries: [
        {
          accountId: clientId,
          accountType: AccountType.CLIENT_WALLET,
          entryType: EntryType.DEBIT,
          amount,
          description: `Payment captured for booking`,
        },
        {
          accountId: 'PLATFORM_ESCROW',
          accountType: AccountType.PLATFORM_ESCROW,
          entryType: EntryType.CREDIT,
          amount,
          description: `Payment received from client ${clientId}`,
        },
      ],
      metadata: {
        paymentId,
        clientId,
        stripePaymentIntentId,
      },
    }

    await this.recordTransaction(transaction)
  }

  /**
   * Record payout (platform escrow → chef wallet)
   */
  async recordPayout(
    payoutId: string,
    chefId: string,
    amount: number,
    commission: number
  ): Promise<void> {
    const netAmount = amount - commission

    const transaction: DoubleEntryTransaction = {
      transactionId: payoutId,
      transactionType: TransactionType.PAYOUT,
      timestamp: new Date(),
      entries: [
        {
          accountId: 'PLATFORM_ESCROW',
          accountType: AccountType.PLATFORM_ESCROW,
          entryType: EntryType.DEBIT,
          amount: netAmount,
          description: `Payout to chef ${chefId}`,
        },
        {
          accountId: chefId,
          accountType: AccountType.CHEF_WALLET,
          entryType: EntryType.CREDIT,
          amount: netAmount,
          description: `Payout received for completed bookings`,
        },
        {
          accountId: 'PLATFORM_ESCROW',
          accountType: AccountType.PLATFORM_ESCROW,
          entryType: EntryType.DEBIT,
          amount: commission,
          description: `Commission from payout`,
        },
        {
          accountId: 'PLATFORM_FEES',
          accountType: AccountType.PLATFORM_FEES,
          entryType: EntryType.CREDIT,
          amount: commission,
          description: `Commission collected from chef ${chefId}`,
        },
      ],
      metadata: {
        payoutId,
        chefId,
        amount,
        commission,
        netAmount,
      },
    }

    await this.recordTransaction(transaction)
  }

  /**
   * Record refund (platform escrow → client wallet)
   */
  async recordRefund(
    refundId: string,
    clientId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const transaction: DoubleEntryTransaction = {
      transactionId: refundId,
      transactionType: TransactionType.REFUND,
      timestamp: new Date(),
      entries: [
        {
          accountId: 'PLATFORM_ESCROW',
          accountType: AccountType.PLATFORM_ESCROW,
          entryType: EntryType.DEBIT,
          amount,
          description: `Refund to client ${clientId}: ${reason}`,
        },
        {
          accountId: clientId,
          accountType: AccountType.CLIENT_WALLET,
          entryType: EntryType.CREDIT,
          amount,
          description: `Refund received: ${reason}`,
        },
      ],
      metadata: {
        refundId,
        clientId,
        reason,
      },
    }

    await this.recordTransaction(transaction)
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string, accountType: AccountType): Promise<number> {
    const entries = await prisma.ledger.findMany({
      where: {
        metadata: { contains: `"accountId":"${accountId}"` },
      },
    })

    let balance = 0
    for (const entry of entries) {
      const metadata = this.parseEntryMetadata(entry.metadata)
      if (metadata.accountId !== accountId || metadata.accountType !== accountType) {
        continue
      }

      if (metadata.entryType === EntryType.CREDIT) {
        balance += entry.amount
      } else {
        balance -= entry.amount
      }
    }

    return balance
  }

  /**
   * Get all account balances
   */
  async getAllBalances(): Promise<Record<string, number>> {
    const entries = await prisma.ledger.findMany({
      where: {
        metadata: { contains: '"doubleEntryTransactionId"' },
      },
    })

    const balances: Record<string, number> = {}

    for (const entry of entries) {
      const metadata = this.parseEntryMetadata(entry.metadata)
      if (!metadata.accountId || !metadata.accountType || !metadata.entryType) {
        continue
      }

      const key = `${metadata.accountType}:${metadata.accountId}`
      if (!balances[key]) {
        balances[key] = 0
      }

      if (metadata.entryType === EntryType.CREDIT) {
        balances[key] += entry.amount
      } else {
        balances[key] -= entry.amount
      }
    }

    return balances
  }

  /**
   * Verify ledger integrity
   * All transactions must balance to zero
   */
  async verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    const entries = await prisma.ledger.findMany({
      where: {
        metadata: { contains: '"doubleEntryTransactionId"' },
      },
    })

    const grouped = new Map<string, typeof entries>()
    for (const entry of entries) {
      const metadata = this.parseEntryMetadata(entry.metadata)
      if (!metadata.doubleEntryTransactionId) {
        continue
      }
      const group = grouped.get(metadata.doubleEntryTransactionId) || []
      group.push(entry)
      grouped.set(metadata.doubleEntryTransactionId, group)
    }

    for (const [transactionId, transactionEntries] of grouped) {
      let balance = 0
      for (const entry of transactionEntries) {
        const metadata = this.parseEntryMetadata(entry.metadata)
        if (metadata.entryType === EntryType.CREDIT) {
          balance += entry.amount
        } else {
          balance -= entry.amount
        }
      }

      if (Math.abs(balance) > 0.01) {
        // Allow for floating point errors
        errors.push(`Transaction ${transactionId} does not balance: ${balance}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    accountId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    const entries = await prisma.ledger.findMany({
      where: { metadata: { contains: `"accountId":"${accountId}"` } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return entries.filter((entry) => this.parseEntryMetadata(entry.metadata).accountId === accountId)
  }

  /**
   * Validate that debit and credit entries balance
   */
  private validateBalance(entries: LedgerEntry[]): void {
    let debits = 0
    let credits = 0

    for (const entry of entries) {
      if (entry.entryType === EntryType.DEBIT) {
        debits += entry.amount
      } else {
        credits += entry.amount
      }
    }

    if (Math.abs(debits - credits) > 0.01) {
      throw new Error(
        `Transaction does not balance: debits ${debits} != credits ${credits}`
      )
    }
  }

  private parseEntryMetadata(metadata: string | null): Record<string, any> {
    if (!metadata) return {}
    try {
      return JSON.parse(metadata)
    } catch {
      return {}
    }
  }
}

export const doubleEntryLedger = new DoubleEntryLedger()
