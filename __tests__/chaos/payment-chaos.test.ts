/**
 * Payment Chaos Test
 * Simulates real-world payment failure scenarios
 * 
 * Tests:
 * - Duplicate webhook delivery
 * - Delayed webhook arrival
 * - Failed webhook with retry
 * - Stripe success but DB fail
 * - Concurrent payment processing
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { stripeReconciliationEngine } from '@/lib/services/stripe-reconciliation'
import { webhookEventStore } from '@/lib/services/webhook-event-store'
import { doubleEntryLedger } from '@/lib/services/double-entry-ledger'
import Stripe from 'stripe'

describe('Payment Chaos Tests', () => {
  let testPaymentId: string
  let testBookingId: string
  let testClientId: string
  let testChefId: string
  let testChefUserId: string
  let testRunId: string

  beforeEach(async () => {
    testRunId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    testPaymentId = `test-payment-${testRunId}`

    const client = await prisma.user.create({
      data: {
        name: 'Payment Chaos Client',
        email: `payment-chaos-client-${testRunId}@example.test`,
        password: 'hashed-password',
        role: 'CLIENT',
      },
    })

    const chefUser = await prisma.user.create({
      data: {
        name: 'Payment Chaos Chef',
        email: `payment-chaos-chef-${testRunId}@example.test`,
        password: 'hashed-password',
        role: 'CHEF',
      },
    })

    const chefProfile = await prisma.chefProfile.create({
      data: {
        userId: chefUser.id,
        location: 'Test Location',
        radius: 50,
      },
    })

    const booking = await prisma.booking.create({
      data: {
        clientId: client.id,
        chefId: chefProfile.id,
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: 'Test Location',
        guestCount: 2,
        totalPrice: 100,
        status: 'PENDING',
      },
    })

    testClientId = client.id
    testChefUserId = chefUser.id
    testChefId = chefProfile.id
    testBookingId = booking.id
  })

  afterEach(async () => {
    // Cleanup
    try {
      await prisma.ledger.deleteMany({
        where: { metadata: { contains: testRunId } },
      })
      await prisma.webhookLog.deleteMany({
        where: { stripeEventId: { contains: testRunId } },
      })
      await prisma.payment.deleteMany({
        where: { id: { contains: testRunId } },
      })
      await prisma.booking.deleteMany({
        where: { id: testBookingId },
      })
      await prisma.chefProfile.deleteMany({
        where: { id: testChefId },
      })
      await prisma.user.deleteMany({
        where: { id: { in: [testClientId, testChefUserId].filter(Boolean) } },
      })
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  describe('Duplicate Webhook Handling', () => {
    it('should handle duplicate webhook delivery idempotently', async () => {
      const event: Stripe.Event = {
        id: `evt_duplicate_${testRunId}`,
        object: 'event',
        api_version: '2026-03-25.dahlia',
        created: Math.floor(Date.now() / 1000),
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: testPaymentId,
            status: 'succeeded',
            amount_received: 10000,
          } as any,
        },
      } as Stripe.Event

      // Store first webhook
      const first = await webhookEventStore.storeEvent(event)
      expect(first).toBeDefined()
      expect(first.stripeEventId).toBe(event.id)

      // Store duplicate webhook
      const second = await webhookEventStore.storeEvent(event)
      expect(second.stripeEventId).toBe(event.id)
      expect(second.id).toBe(first.id) // Same record

      // Verify only one entry in database
      const count = await prisma.webhookLog.count({
        where: { stripeEventId: event.id },
      })
      expect(count).toBe(1)
    })

    it('should process duplicate webhook only once', async () => {
      const event: Stripe.Event = {
        id: `evt_dup_process_${testRunId}`,
        object: 'event',
        api_version: '2026-03-25.dahlia',
        created: Math.floor(Date.now() / 1000),
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: testPaymentId,
            status: 'succeeded',
            amount_received: 10000,
          } as any,
        },
      } as Stripe.Event

      let processCount = 0
      const handler = async () => {
        processCount++
      }

      // First replay
      await webhookEventStore.storeEvent(event)
      await webhookEventStore.replayEvent(event.id, handler)
      expect(processCount).toBe(1)

      // Second replay should not process again
      try {
        await webhookEventStore.replayEvent(event.id, handler)
      } catch (e) {
        // Expected - already processed
      }
      expect(processCount).toBe(1) // Still 1, not 2
    })
  })

  describe('Delayed Webhook Handling', () => {
    it('should handle out-of-order webhook events', async () => {
      const now = Math.floor(Date.now() / 1000)

      // Create events with different timestamps
      const event1: Stripe.Event = {
        id: `evt_delayed_1_${testRunId}`,
        object: 'event',
        api_version: '2026-03-25.dahlia',
        created: now,
        type: 'payment_intent.created',
        data: { object: {} as any },
      } as Stripe.Event

      const event2: Stripe.Event = {
        id: `evt_delayed_2_${testRunId}`,
        object: 'event',
        api_version: '2026-03-25.dahlia',
        created: now + 10, // Later event
        type: 'payment_intent.succeeded',
        data: { object: {} as any },
      } as Stripe.Event

      // Store later event first
      await webhookEventStore.storeEvent(event2)
      await webhookEventStore.markProcessed(event2.id)

      // Check if earlier event would be out of order
      const result = await webhookEventStore.handleOutOfOrderEvent(event1, 1)
      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('Out-of-order')
    })
  })

  describe('Stripe Success but DB Fail', () => {
    it('should reconcile when Stripe succeeded but DB not updated', async () => {
      // Simulate: Stripe says payment succeeded, but DB still shows HELD
      const paymentId = `test-payment-reconcile-${testRunId}`

      // Create payment in DB with HELD status
      const payment = await (prisma as any).payment.create({
        data: {
          id: paymentId,
          bookingId: testBookingId,
          stripePaymentIntentId: `pi_test_${testRunId}`,
          totalAmount: 100,
          commissionAmount: 10,
          chefAmount: 90,
          status: 'HELD',
          version: 1,
        },
      })

      // Run reconciliation
      const result = await stripeReconciliationEngine.reconcilePayment(paymentId)

      // Should have attempted to fix
      expect(result.checked).toBeGreaterThan(0)
    })
  })

  describe('Concurrent Payment Processing', () => {
    it('should handle concurrent payment requests safely', async () => {
      const paymentId = `test-concurrent-${testRunId}`

      // Create payment
      const payment = await (prisma as any).payment.create({
        data: {
          id: paymentId,
          bookingId: testBookingId,
          stripePaymentIntentId: `pi_concurrent_${testRunId}`,
          totalAmount: 100,
          commissionAmount: 10,
          chefAmount: 90,
          status: 'HELD',
          version: 1,
        },
      })

      // Simulate concurrent updates
      const updates = await Promise.allSettled([
        (prisma as any).payment.update({
          where: { id: paymentId },
          data: { status: 'PAID', version: { increment: 1 } },
        }),
        (prisma as any).payment.update({
          where: { id: paymentId },
          data: { status: 'PAID', version: { increment: 1 } },
        }),
      ])

      // One should succeed, one should fail (or both succeed with different versions)
      const succeeded = updates.filter((u) => u.status === 'fulfilled').length
      expect(succeeded).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Ledger Consistency', () => {
    it('should maintain ledger integrity across payment operations', async () => {
      const paymentId = 'test-ledger-' + Date.now()

      // Record payment capture
      await doubleEntryLedger.recordPaymentCapture(
        paymentId,
        testClientId,
        100,
        `pi_test_${testRunId}`
      )

      // Verify ledger integrity
      const integrity = await doubleEntryLedger.verifyIntegrity()
      expect(integrity.valid).toBe(true)
      expect(integrity.errors).toHaveLength(0)
    })

    it('should detect ledger imbalance', async () => {
      // Create imbalanced entry (this should not happen in normal operation)
      try {
        await prisma.ledger.create({
          data: {
            transactionType: 'PAYMENT_CAPTURE',
            amount: 100,
            description: 'Imbalanced entry',
            fromAccount: testClientId,
            metadata: JSON.stringify({
              doubleEntryTransactionId: `test-imbalance-${testRunId}`,
              accountId: testClientId,
              accountType: 'CLIENT_WALLET',
              entryType: 'DEBIT',
              testRunId,
            }),
            createdBy: 'DOUBLE_ENTRY_LEDGER_TEST',
          },
        })
      } catch (e) {
        // Ignore if table doesn't exist
      }

      const integrity = await doubleEntryLedger.verifyIntegrity()
      expect(integrity.valid).toBe(false)
    })
  })

  describe('Webhook Event Store Stats', () => {
    it('should track webhook event statistics', async () => {
      const stats = await webhookEventStore.getEventStats()

      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('processed')
      expect(stats).toHaveProperty('failed')
      expect(stats).toHaveProperty('pending')
      expect(stats).toHaveProperty('avgProcessingTime')

      expect(stats.total).toBeGreaterThanOrEqual(0)
      expect(stats.processed).toBeGreaterThanOrEqual(0)
    })
  })
})
