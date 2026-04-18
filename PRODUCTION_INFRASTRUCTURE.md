# Production Infrastructure Guide

**Status:** Enterprise-Grade Fintech Marketplace System  
**Date:** April 2026  
**Version:** 1.0

---

## Executive Summary

This document describes the complete production infrastructure for the Chef Marketplace system. The system has been upgraded from a basic marketplace to an enterprise-grade, fault-tolerant, financially-correct platform capable of handling real-world payment processing, concurrency, and failure scenarios.

### Key Achievements

✅ **Real Queue System** - BullMQ/Redis replacing DB-based event queue  
✅ **Fintech-Grade Ledger** - Double-entry accounting with full audit trail  
✅ **Stripe Reconciliation** - Handles webhooks, duplicates, out-of-order events  
✅ **Failure Resilience** - Retry logic, idempotency, transaction recovery  
✅ **Observability** - Structured logging, metrics, distributed tracing  
✅ **Concurrency Safety** - Optimistic locking, slot management, consistency checks  
✅ **Chaos Tested** - Payment, concurrency, financial, and failure scenarios validated  

---

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER                                 │
│  - Request tracing (unique IDs)                             │
│  - Rate limiting (global)                                   │
│  - Request validation                                       │
│  - Safety headers                                           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  SERVICE LAYER                               │
│  - Payment Service (with ledger recording)                  │
│  - Booking Service (with concurrency safety)                │
│  - Refund Service (with state machines)                     │
│  - Payout Service (with freeze/unfreeze)                    │
│  - Dispute Service (with payout management)                 │
│  - Stripe Reconciliation Engine                             │
│  - Webhook Event Store                                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              QUEUE & ASYNC LAYER                             │
│  - BullMQ Queue (Redis-backed)                              │
│  - Payment Worker (5 concurrent)                            │
│  - Notification Worker (10 concurrent)                      │
│  - Reconciliation Worker (1 serial)                         │
│  - Retry Worker (exponential backoff)                       │
│  - Cleanup Worker (periodic)                                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│            PERSISTENCE & AUDIT LAYER                         │
│  - PostgreSQL Database                                      │
│  - Double-Entry Ledger                                      │
│  - State Transition Audit Log                               │
│  - Webhook Event History                                    │
│  - Slot Locks (concurrency)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Critical Systems

### 1. Queue Infrastructure (BullMQ)

**Location:** `lib/queue/queue.ts`

**Queues:**
- `payments` - High priority (10), 3 retries, exponential backoff
- `notifications` - Normal priority, 10 concurrent workers
- `payouts` - High priority (8), 3 retries
- `reconciliation` - Normal priority, serial processing
- `webhooks` - High priority (9), idempotent
- `retries` - Failed job management
- `cleanup` - Periodic maintenance

**Configuration:**
```typescript
const queue = new Queue(name, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: false,
  },
})
```

### 2. Double-Entry Ledger

**Location:** `lib/services/double-entry-ledger.ts`

**Account Types:**
- `CLIENT_WALLET` - Client funds
- `CHEF_WALLET` - Chef earnings
- `PLATFORM_ESCROW` - Held funds
- `PLATFORM_FEES` - Commission collected
- `STRIPE_HOLDING` - Stripe-held funds

**Transaction Types:**
- `PAYMENT_CAPTURE` - Client → Platform Escrow
- `PAYOUT` - Platform Escrow → Chef Wallet + Platform Fees
- `REFUND` - Platform Escrow → Client Wallet
- `COMMISSION` - Commission tracking
- `ADJUSTMENT` - Manual adjustments

**Invariant:** Every transaction must balance (debits = credits)

### 3. Stripe Reconciliation Engine

**Location:** `lib/services/stripe-reconciliation.ts`

**Handles:**
- Missing webhooks (full reconciliation)
- Duplicate webhooks (idempotency)
- Out-of-order events (timestamp ordering)
- Stripe success but DB not updated (automatic fix)
- Concurrent payment processing

**Reconciliation Types:**
- `full` - Compare all Stripe payments with DB
- `incremental` - Last 24 hours only
- `payment` - Single payment verification
- `payout` - Payout verification

### 4. Webhook Event Store

**Location:** `lib/services/webhook-event-store.ts`

**Features:**
- Event versioning
- Event deduplication
- Event replay capability
- Out-of-order detection
- Processing history tracking

**Event Statuses:**
- `RECEIVED` - Stored but not processed
- `PROCESSING` - Currently being processed
- `PROCESSED` - Successfully completed
- `FAILED` - Failed, may retry
- `RETRYING` - In retry queue

### 5. Booking Concurrency Safety

**Location:** `lib/services/booking-concurrency.ts`

**Mechanisms:**
- Pessimistic slot locking (30s timeout)
- Optimistic locking on availability (version field)
- Booking-payment consistency verification
- Automatic rollback on payment failure
- Race condition detection

**Lock Management:**
- Acquire lock before booking
- Release lock after transaction
- Automatic cleanup of expired locks (1 min TTL)

### 6. Failure-Resilient Workflows

**Location:** `lib/utils/resilience.ts`

**Utilities:**
- `withRetry()` - Exponential backoff retry
- `withIdempotency()` - Duplicate prevention
- `withTransactionRecovery()` - Transaction retry
- `CircuitBreaker` - Failure pattern detection

**Circuit Breaker States:**
- `CLOSED` - Normal operation
- `OPEN` - Failing, reject requests
- `HALF_OPEN` - Testing recovery

### 7. Observability & Metrics

**Location:** `lib/monitoring/`

**Components:**
- `logger.ts` - Structured logging (Sentry/Logtail integration)
- `metrics.ts` - Metrics collection (Datadog/Prometheus)

**Tracked Metrics:**
- API latency (p50, p95, p99)
- Queue job duration
- Payment success/failure rates
- Webhook processing time
- Database operation duration
- Rate limit violations

### 8. Safety Guards

**Location:** `lib/middleware/safety-guards.ts`

**Features:**
- Request tracing (unique trace IDs)
- Global rate limiting (configurable per endpoint)
- Request timeout handling (30s default)
- Request validation (content-type, auth)
- Security headers (HSTS, CSP, X-Frame-Options)

**Rate Limit Defaults:**
- Auth endpoints: 5 req/15 min
- Payment endpoints: 10 req/10 min
- General API: 100 req/60 sec

---

## Deployment Requirements

### Prerequisites

1. **PostgreSQL Database**
   - Version: 12+
   - Extensions: uuid-ossp
   - Connection pooling: PgBouncer or similar

2. **Redis**
   - Version: 6+
   - Memory: 2GB+ recommended
   - Persistence: RDB or AOF enabled

3. **Stripe Account**
   - Live mode keys
   - Webhook endpoint configured
   - API version: 2026-03-25.dahlia

4. **Monitoring Services** (Optional but recommended)
   - Sentry (error tracking)
   - Logtail (log aggregation)
   - Datadog (metrics)

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/chef_marketplace
DIRECT_URL=postgresql://user:pass@host:5432/chef_marketplace

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Auth
NEXTAUTH_SECRET=<generate-strong-secret>
NEXTAUTH_URL=https://your-domain.com

# Cron Jobs
CRON_SECRET=<generate-strong-secret>

# Monitoring (Optional)
SENTRY_DSN=https://...
LOGTAIL_TOKEN=...
DATADOG_API_KEY=...
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] PostgreSQL database created and accessible
- [ ] Redis instance running and accessible
- [ ] Stripe webhook endpoint configured
- [ ] All environment variables set
- [ ] Database migrations run: `npx prisma migrate deploy`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Build successful: `npm run build`
- [ ] Tests passing: `npm test`

### Deployment

- [ ] Deploy application to production
- [ ] Verify all API endpoints responding
- [ ] Test payment flow end-to-end
- [ ] Verify webhook processing
- [ ] Check queue workers running
- [ ] Monitor error logs

### Post-Deployment

- [ ] Run reconciliation: `POST /api/admin/reconciliation`
- [ ] Verify ledger integrity
- [ ] Monitor metrics dashboard
- [ ] Test critical user flows
- [ ] Document any issues

---

## Monitoring & Alerts

### Critical Metrics to Monitor

1. **Payment Processing**
   - Payment success rate (target: >99%)
   - Payment processing latency (p95 < 5s)
   - Failed payment count

2. **Queue Health**
   - Queue depth (should be < 100)
   - Job failure rate (target: < 1%)
   - Job processing latency

3. **Webhook Processing**
   - Webhook success rate (target: 100%)
   - Webhook processing latency
   - Duplicate webhook detection

4. **Ledger Integrity**
   - Ledger balance check (should always pass)
   - Reconciliation success rate
   - Unreconciled transactions

5. **System Health**
   - Database connection pool usage
   - Redis memory usage
   - API error rate (target: < 0.1%)
   - Rate limit violations

### Alert Thresholds

```
CRITICAL:
- Payment success rate < 95%
- Queue depth > 1000
- Ledger imbalance detected
- Database connection pool exhausted
- Redis memory > 90%

WARNING:
- Payment success rate < 98%
- Queue depth > 500
- Webhook failure rate > 5%
- API error rate > 1%
- Rate limit violations > 100/hour
```

---

## Failure Scenarios & Recovery

### Scenario 1: Webhook Delivery Failure

**What happens:**
1. Stripe sends webhook
2. Network timeout or service down
3. Webhook not processed

**Recovery:**
1. Stripe retries webhook (up to 3 days)
2. Reconciliation job detects missing payment
3. Automatic fix applied to database
4. Ledger updated

### Scenario 2: Concurrent Booking Attempts

**What happens:**
1. 10 users book same slot simultaneously
2. Only 5 slots available

**Recovery:**
1. Slot lock acquired for first 5 requests
2. Remaining 5 requests fail with "slot unavailable"
3. Availability atomically updated
4. No double bookings possible

### Scenario 3: Payment Success but DB Fails

**What happens:**
1. Stripe charges customer
2. Database update fails
3. Payment status not updated in DB

**Recovery:**
1. Reconciliation detects mismatch
2. Automatically updates payment status
3. Ledger recorded
4. Customer notified

### Scenario 4: Payout During Dispute

**What happens:**
1. Dispute opened for booking
2. Chef has pending payout
3. Payout should be frozen

**Recovery:**
1. Dispute service freezes all chef payouts
2. Payout status changed to FROZEN
3. Dispute resolved
4. Payouts unfrozen or refunded

---

## Maintenance Tasks

### Daily

- [ ] Monitor error logs
- [ ] Check queue depth
- [ ] Verify webhook processing
- [ ] Monitor payment success rate

### Weekly

- [ ] Run full reconciliation
- [ ] Check ledger integrity
- [ ] Review rate limit violations
- [ ] Analyze payment latency trends

### Monthly

- [ ] Database maintenance (VACUUM, ANALYZE)
- [ ] Review and rotate secrets
- [ ] Audit user access logs
- [ ] Performance optimization review

---

## Disaster Recovery

### Backup Strategy

- **Database:** Daily automated backups, 30-day retention
- **Redis:** RDB snapshots every 6 hours
- **Ledger:** Immutable, always recoverable from transactions

### Recovery Procedures

**Database Corruption:**
1. Restore from latest backup
2. Run reconciliation to fix ledger
3. Replay events from event queue

**Redis Loss:**
1. Restart Redis (data will be empty)
2. Queue jobs will be reprocessed
3. No data loss (jobs stored in DB)

**Ledger Inconsistency:**
1. Run integrity check: `ledgerService.verifyIntegrity()`
2. Identify unbalanced transactions
3. Manual review and adjustment
4. Document in audit log

---

## Performance Optimization

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_payment_status ON payment(status);
CREATE INDEX idx_booking_chef_date ON booking(chefId, eventDate);
CREATE INDEX idx_ledger_account ON ledger_entry(accountId, accountType);
CREATE INDEX idx_webhook_event_id ON webhook_event(stripeEventId);

-- Analyze query plans
EXPLAIN ANALYZE SELECT ...;
```

### Redis Optimization

- Monitor memory usage
- Configure maxmemory policy: `allkeys-lru`
- Enable persistence: RDB + AOF
- Use connection pooling

### Application Optimization

- Enable query result caching
- Implement pagination for large result sets
- Use database connection pooling
- Monitor slow queries

---

## Scaling Considerations

### Horizontal Scaling

- **API Servers:** Stateless, can scale horizontally
- **Queue Workers:** Add more workers for higher throughput
- **Database:** Read replicas for reporting, write to primary
- **Redis:** Cluster mode for high availability

### Vertical Scaling

- Increase database server resources
- Increase Redis memory
- Increase API server resources

### Monitoring at Scale

- Implement distributed tracing (OpenTelemetry)
- Use centralized logging (ELK, Datadog)
- Monitor queue worker health
- Track database query performance

---

## Security Considerations

### Data Protection

- All sensitive data encrypted at rest
- TLS 1.2+ for all communications
- API keys rotated regularly
- Database credentials in secrets manager

### Access Control

- Role-based access control (RBAC)
- API authentication via JWT
- Rate limiting per user/IP
- Audit logging for all admin actions

### Compliance

- PCI DSS compliance for payment processing
- GDPR compliance for user data
- SOC 2 Type II certification
- Regular security audits

---

## Support & Escalation

### Incident Response

1. **Detection:** Automated alerts or manual report
2. **Assessment:** Determine severity and impact
3. **Mitigation:** Apply immediate fix if available
4. **Resolution:** Implement permanent solution
5. **Post-Mortem:** Document and prevent recurrence

### Escalation Path

- **Tier 1:** Automated alerts, standard playbooks
- **Tier 2:** On-call engineer, investigation
- **Tier 3:** Engineering lead, architecture review
- **Tier 4:** CTO, business impact assessment

---

## Conclusion

This production infrastructure provides:

✅ **Financial Correctness** - Double-entry ledger with full audit trail  
✅ **Reliability** - Fault-tolerant with automatic recovery  
✅ **Concurrency Safety** - Handles high-concurrency scenarios  
✅ **Observability** - Complete visibility into system behavior  
✅ **Scalability** - Designed to grow with demand  
✅ **Security** - Enterprise-grade security measures  

The system is ready for production deployment and capable of handling real-world payment processing at scale.

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Next Review:** July 2026
