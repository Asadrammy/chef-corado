# Production Deployment Checklist

**Project:** Chef Marketplace  
**Date:** April 2026  
**Status:** Pre-Deployment Phase

---

## Pre-Deployment Requirements

### 1. Database Migration (CRITICAL)

- [ ] **Backup existing data**
  ```bash
  # Backup SQLite database
  cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)
  ```

- [ ] **Set up PostgreSQL database**
  - Create PostgreSQL instance (local/dev/production)
  - Configure connection strings in `.env`
  - Ensure database user has proper permissions

- [ ] **Update environment variables**
  ```env
  DATABASE_URL="postgresql://user:password@localhost:5432/chef_marketplace"
  DIRECT_URL="postgresql://user:password@localhost:5432/chef_marketplace"
  ```

- [ ] **Generate Prisma client**
  ```bash
  npx prisma generate
  ```

- [ ] **Run database migration**
  ```bash
  npx prisma migrate dev --name production_schema
  # Or for production:
  npx prisma migrate deploy
  ```

- [ ] **Verify schema sync**
  ```bash
  npx prisma validate
  npx prisma db pull
  ```

- [ ] **Seed test data (optional)**
  ```bash
  npx prisma db seed
  ```

---

### 2. Environment Configuration

- [ ] **Stripe configuration**
  ```env
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PUBLISHABLE_KEY=pk_live_...
  ```

- [ ] **Authentication secrets**
  ```env
  NEXTAUTH_SECRET=<generate-strong-secret>
  NEXTAUTH_URL=https://your-domain.com
  ```

- [ ] **Cron job secret**
  ```env
  CRON_SECRET=<generate-strong-secret>
  ```

- [ ] **Redis (optional, for production)**
  ```env
  REDIS_URL=redis://localhost:6379
  UPSTASH_REDIS_REST_URL=https://...
  UPSTASH_REDIS_REST_TOKEN=...
  ```

---

### 3. Build & Verification

- [ ] **Install dependencies**
  ```bash
  npm ci
  ```

- [ ] **Run TypeScript check**
  ```bash
  npx tsc --noEmit
  ```

- [ ] **Build application**
  ```bash
  npm run build
  ```

- [ ] **Run tests**
  ```bash
  npm test
  ```

- [ ] **Verify all routes generate**
  - Check build output for route generation
  - Ensure no 404s for critical paths

---

### 4. Vercel Configuration

- [ ] **Update vercel.json**
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/process-events",
        "schedule": "*/5 * * * *"
      },
      {
        "path": "/api/cron/expire-proposals",
        "schedule": "0 * * * *"
      }
    ]
  }
  ```

- [ ] **Configure environment variables in Vercel**
  - Add all secrets from `.env`
  - Set NODE_ENV=production

- [ ] **Configure domains**
  - Set custom domain
  - Configure SSL certificates

---

### 5. Stripe Webhook Configuration

- [ ] **Create webhook endpoint in Stripe Dashboard**
  - URL: `https://your-domain.com/api/payments/webhook`
  - Events to listen:
    - `checkout.session.completed`
    - `payment_intent.succeeded`
    - `payment_intent.payment_failed`
    - `charge.refunded`
    - `transfer.created`
    - `transfer.failed`

- [ ] **Copy webhook signing secret**
  - Add to environment variables as `STRIPE_WEBHOOK_SECRET`

- [ ] **Test webhook endpoint**
  ```bash
  stripe listen --forward-to localhost:3000/api/payments/webhook
  ```

---

### 6. Post-Deployment Verification

#### Critical Flows Test

- [ ] **User Registration**
  - Client can register
  - Chef can register
  - Email verification works (if enabled)

- [ ] **Booking Flow**
  - Client can browse experiences
  - Client can book an experience
  - Availability updates correctly
  - Chef receives notification

- [ ] **Payment Flow**
  - Stripe checkout works
  - Payment confirmation received
  - Webhook processed correctly
  - Ledger entry created

- [ ] **Payout Flow**
  - Chef can request payout
  - Admin can process payout
  - Ledger entry created
  - Stripe transfer created

- [ ] **Refund Flow**
  - Admin can approve refund
  - Stripe refund processed
  - Ledger entry created
  - Notifications sent

- [ ] **Dispute Flow**
  - Client/Chef can open dispute
  - Payouts frozen
  - Admin can resolve
  - Payouts unfrozen (if chef favor)
  - Refund processed (if client favor)

- [ ] **Event Queue**
  - Cron job runs successfully
  - Events are processed
  - Failed events are retried

---

### 7. Monitoring Setup

- [ ] **Set up logging**
  - Configure log aggregation (e.g., Datadog, Loggly)
  - Set up alerts for ERROR level logs

- [ ] **Set up health checks**
  - `/api/health` endpoint monitoring
  - Database connection monitoring
  - Stripe API monitoring

- [ ] **Set up alerts for**
  - Failed webhooks
  - Failed payouts
  - Ledger discrepancies
  - High event queue backlog
  - Database connection failures

---

### 8. Security Checklist

- [ ] **Enable HTTPS**
  - SSL certificate configured
  - HTTP redirects to HTTPS

- [ ] **Verify rate limiting**
  - Auth endpoints: 5 req/15 min
  - Payment endpoints: 10 req/10 min
  - General API: 100 req/15 min

- [ ] **Verify CORS settings**
  - Only allow your domain

- [ ] **Verify security headers**
  - Content Security Policy
  - X-Frame-Options
  - X-Content-Type-Options

- [ ] **Database security**
  - Strong passwords
  - Limited user permissions
  - Connection encryption (SSL)

---

### 9. Backup & Recovery

- [ ] **Set up automated database backups**
  - Daily backups minimum
  - Test restore procedure

- [ ] **Document recovery procedures**
  - Database restore steps
  - Rollback procedures
  - Emergency contacts

---

### 10. Documentation

- [ ] **API Documentation**
  - All endpoints documented
  - Authentication requirements specified
  - Rate limits documented

- [ ] **Runbook**
  - Common issues and solutions
  - Escalation procedures
  - Contact information

- [ ] **Monitoring Dashboards**
  - Financial metrics
  - System health
  - Business metrics

---

## Post-Deployment Tasks (First Week)

### Day 1
- [ ] Monitor error logs hourly
- [ ] Verify webhook processing
- [ ] Check event queue processing
- [ ] Test critical user flows

### Day 2-3
- [ ] Review ledger entries
- [ ] Verify payment reconciliation
- [ ] Check dispute handling
- [ ] Monitor payout processing

### Week 1
- [ ] Generate financial report
- [ ] Review user feedback
- [ ] Check performance metrics
- [ ] Plan optimization tasks

---

## Rollback Plan

If critical issues occur:

1. **Immediate (Stop the bleeding)**
   ```bash
   # Disable problematic features via feature flags
   # Or revert to previous deployment
   vercel --version <previous-version>
   ```

2. **Database rollback**
   ```bash
   # If migration caused issues
   npx prisma migrate resolve --rolled-back <migration-name>
   # Restore from backup if needed
   ```

3. **Communication**
   - Notify users of issues
   - Provide ETA for resolution
   - Document lessons learned

---

## Sign-Off

**Pre-Deployment Review:**
- [ ] Technical Lead: _________________
- [ ] Product Owner: _________________
- [ ] Security Review: _________________

**Post-Deployment Verification:**
- [ ] All critical flows tested: _________________
- [ ] Monitoring active: _________________
- [ ] Rollback plan documented: _________________

---

## Quick Reference

### Critical Commands
```bash
# Database
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db seed
npx prisma studio

# Build
npm run build
npm run start

# Logs
vercel logs <deployment-url>
```

### Emergency Contacts
- Technical Lead: [Contact]
- DevOps: [Contact]
- Stripe Support: support@stripe.com
- Vercel Support: support@vercel.com

---

**END OF CHECKLIST**
