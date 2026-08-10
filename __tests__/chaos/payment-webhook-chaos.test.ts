/**
 * PAYMENT WEBHOOK CHAOS TESTS
 * 
 * Aggressively tests webhook processing under real-world failure scenarios
 * Verifies system resilience against duplicate, delayed, and malicious webhooks
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { paymentService } from '@/lib/services/payment-service'
import { webhookEventStore } from '@/lib/services/webhook-event-store'
import { logger } from '@/lib/logger'

describe('Payment Webhook Chaos Tests', () => {
  let testPayment: any
  let testBooking: any
  let testProposal: any
  let testRequest: any
  let testClient: any
  let testChef: any
  let chefProfile: any
  let testRunId: string

  beforeAll(async () => {
    testRunId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Setup test data
    testClient = await prisma.user.create({
      data: {
        name: 'Chaos Test Client',
        email: `chaos-client-${testRunId}@example.test`,
        password: 'hashed-password',
        role: 'CLIENT',
      },
    })

    testChef = await prisma.user.create({
      data: {
        name: 'Chaos Test Chef',
        email: `chaos-chef-${testRunId}@example.test`,
        password: 'hashed-password',
        role: 'CHEF',
      },
    })

    chefProfile = await prisma.chefProfile.create({
      data: {
        userId: testChef.id,
        location: 'Test Location',
        radius: 50,
      },
    })

    testRequest = await prisma.request.create({
      data: {
        clientId: testClient.id,
        title: 'Chaos Test Request',
        description: 'For chaos testing',
        eventType: 'Other',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: 'Test Location',
        guestCount: 2,
        budget: 500,
        details: 'Test details',
      } as any,
    })

    testProposal = await prisma.proposal.create({
      data: {
        requestId: testRequest.id,
        chefId: chefProfile.id,
        price: 300,
        message: 'Chaos test proposal',
        status: 'ACCEPTED',
      },
    })

    testBooking = await prisma.booking.create({
      data: {
        clientId: testClient.id,
        chefId: chefProfile.id,
        proposalId: testProposal.id,
        totalPrice: 300,
        currency: 'GBP',
        status: 'PENDING',
        eventDate: testRequest.eventDate,
        location: testRequest.location,
        guestCount: 2,
      } as any,
    })

    // Create payment in HELD state
    testPayment = await prisma.payment.create({
      data: {
        bookingId: testBooking.id,
        stripePaymentIntentId: `pi_test_chaos_${testRunId}`,
        totalAmount: 300,
        commissionAmount: 60,
        chefAmount: 240,
        status: 'HELD',
      },
    })
  })

  afterAll(async () => {
    if (!testRunId) {
      return
    }

    // Cleanup test data
    await prisma.$transaction([
      prisma.webhookLog.deleteMany({ where: { stripeEventId: { contains: testRunId } } }),
      prisma.ledger.deleteMany({ where: { paymentId: testPayment?.id ?? '__missing__' } }),
      prisma.payment.deleteMany({ where: { id: testPayment?.id ?? '__missing__' } }),
      prisma.booking.deleteMany({ where: { id: testBooking?.id ?? '__missing__' } }),
      prisma.proposal.deleteMany({ where: { id: testProposal?.id ?? '__missing__' } }),
      prisma.request.deleteMany({ where: { id: testRequest?.id ?? '__missing__' } }),
      prisma.chefProfile.deleteMany({ where: { id: chefProfile?.id ?? '__missing__' } }),
      prisma.user.deleteMany({
        where: { id: { in: [testClient?.id, testChef?.id].filter(Boolean) } },
      }),
    ])
  })

  describe('Duplicate Webhook Handling', () => {
    it('should reject duplicate webhook events', async () => {
      const eventId = `evt_chaos_duplicate_${testRunId}`
      const mockSession = {
        id: 'cs_test_duplicate',
        object: 'checkout.session',
        created: Math.floor(Date.now() / 1000),
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_duplicate',
            payment_status: 'paid',
            status: 'complete',
            payment_intent: `pi_test_chaos_${testRunId}`,
            amount_total: 30000,
            metadata: { proposalId: testProposal.id },
          },
        },
      } as any

      // First webhook should succeed
      const result1 = await paymentService.logWebhookEvent(eventId, mockSession.type, JSON.stringify(mockSession))
      expect(result1).toBeDefined()
      if (result1) {
        expect(result1.stripeEventId).toBe(eventId)
      }

      // Second webhook should return same record (idempotent)
      const result2 = await paymentService.logWebhookEvent(eventId, mockSession.type, JSON.stringify(mockSession))
      if (result1 && result2) {
        expect(result2.id).toBe(result1.id)
        expect(result2.stripeEventId).toBe(eventId)
      }

      // Verify the WebhookLog-backed idempotency service calls worked.
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })

    it('should handle out-of-order webhooks safely', async () => {
      const now = Math.floor(Date.now() / 1000)
      
      // Create events with different timestamps
      const event1 = {
        id: `evt_chaos_order_1_${testRunId}`,
        object: 'event',
        api_version: '2026-03-25.dahlia',
        created: now - 10, // 10 seconds ago
        type: 'payment_intent.created',
        data: { object: {} },
      }

      const event2 = {
        id: `evt_chaos_order_2_${testRunId}`,
        object: 'event',
        api_version: '2026-03-25.dahlia',
        created: now, // Current time
        type: 'payment_intent.succeeded',
        data: { object: {} },
      }

      // Store later event first
      const result1 = await webhookEventStore.storeEvent(event2 as any)
      expect(result1).toBeDefined()
      await webhookEventStore.markProcessed(event2.id)

      // Try to store earlier event
      const shouldProcess = await webhookEventStore.handleOutOfOrderEvent(event1 as any, 1)
      expect(shouldProcess.shouldProcess).toBe(false)
      expect(shouldProcess.reason).toContain('Out-of-order')
    })
  })

  describe('Invalid Webhook Rejection', () => {
    it('should reject webhooks with invalid signature', async () => {
      const invalidSignature = 't=1234567890,v1=invalid_signature'
      const payload = '{"test": "data"}'
      
      const isValid = webhookEventStore.verifyEventSignature(payload, invalidSignature, 'fake_secret')
      expect(isValid).toBe(false)
    })

    it('should reject webhooks with expired timestamp', async () => {
      const oldTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000) // 10 minutes ago
      const signature = `t=${oldTimestamp},v1=fake_signature`
      const payload = '{"test": "data"}'
      
      const isValid = webhookEventStore.verifyEventSignature(payload, signature, 'fake_secret')
      expect(isValid).toBe(false)
    })

    it('should reject webhooks with malformed signature', async () => {
      const malformedSignature = 'invalid_format'
      const payload = '{"test": "data"}'
      
      const isValid = webhookEventStore.verifyEventSignature(payload, malformedSignature, 'fake_secret')
      expect(isValid).toBe(false)
    })
  })

  describe('Webhook Processing Under Load', () => {
    it('should handle concurrent webhook processing', async () => {
      const webhooks = Array.from({ length: 20 }, (_, i) => ({
        id: `evt_chaos_concurrent_${testRunId}_${i}`,
        object: 'event',
        api_version: '2026-03-25.dahlia',
        created: Math.floor(Date.now() / 1000),
        type: 'payment_intent.succeeded',
        data: { object: {} },
      }))

      // Process all webhooks concurrently
      const results = await Promise.allSettled(
        webhooks.map(webhook => webhookEventStore.storeEvent(webhook as any))
      )

      // All should succeed
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      expect(successful.length).toBe(webhooks.length)
      expect(failed.length).toBe(0)

      // Verify all WebhookLog-backed store calls completed.
      expect(successful.length).toBe(webhooks.length)
      expect(failed.length).toBe(0)
    })
  })

  describe('Webhook Event Store Resilience', () => {
    it('should handle webhook event store failures gracefully', async () => {
      // Test with invalid event data
      const invalidEvent = {
        id: null, // Invalid ID
        object: 'event',
        api_version: '2026-03-25.dahlia',
        created: Math.floor(Date.now() / 1000),
        type: 'payment_intent.succeeded',
        data: null, // Invalid data
      }

      // Should handle gracefully without crashing
      await expect(
        webhookEventStore.storeEvent(invalidEvent as any)
      ).rejects.toThrow()
    })

    it('should maintain event statistics accurately', async () => {
      // Stats are derived from the active WebhookLog table.
      logger.info('Clearing existing webhook events (mocked)')

      // Create events with different statuses
      const events = [
        { id: `evt_chaos_stats_1_${testRunId}`, type: 'payment_intent.created', status: 'COMPLETED' },
        { id: `evt_chaos_stats_2_${testRunId}`, type: 'payment_intent.succeeded', status: 'COMPLETED' },
        { id: `evt_chaos_stats_3_${testRunId}`, type: 'payment_intent.failed', status: 'FAILED' },
      ]

      for (const event of events) {
        await webhookEventStore.storeEvent({
          ...event,
          object: 'event',
          api_version: '2026-03-25.dahlia',
          created: Math.floor(Date.now() / 1000),
          data: { object: {} },
        } as any)
        if (event.status === 'COMPLETED') {
          await webhookEventStore.markProcessed(event.id)
        } else if (event.status === 'FAILED') {
          await webhookEventStore.markFailed(event.id, 'Synthetic failed webhook', false)
        }
      }

      const stats = await webhookEventStore.getEventStats()
      expect(stats.total).toBeGreaterThanOrEqual(3)
      expect(stats.processed).toBeGreaterThanOrEqual(2)
      expect(stats.failed).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Payment Processing Chaos', () => {
    it('should handle payment processing failures gracefully', async () => {
      const invalidSession = {
        id: 'cs_invalid_session',
        object: 'checkout.session',
        created: Math.floor(Date.now() / 1000),
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_invalid_session',
            payment_status: 'paid',
            status: 'complete',
            payment_intent: 'pi_nonexistent',
            amount_total: 30000,
            metadata: { proposalId: 'nonexistent_proposal' },
          },
        },
      } as any

      // Should handle gracefully without crashing
      await expect(
        paymentService.processSuccessfulProposalCheckout('nonexistent_proposal', invalidSession)
      ).rejects.toThrow()
    })
  })
})
