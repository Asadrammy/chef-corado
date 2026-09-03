# ChefaChef Final Remediation Release Preparation

## Production Guard

Do not deploy production until staging passes browser QA, external-service verification, and owner-approved data recovery decisions. Production must not reuse staging data, staging Stripe keys, or dry-run reconciliation output.

## Safe Staging Path

1. Push the final remediation commit to a staging-only branch.
2. Create or verify an isolated Render staging web service connected to that staging branch.
3. Create or verify a separate staging PostgreSQL database.
4. Configure staging-only environment variables without copying production secrets into public logs.
5. Run migrations with `npx prisma migrate deploy` only against the staging database.
6. Run browser QA against the staging URL before any production promotion.

## Render Cron Requirements

Render cron jobs or an equivalent scheduled caller must invoke these authenticated endpoints:

- `GET /api/cron/process-events` every 5 minutes with `Authorization: Bearer $CRON_SECRET`
- `GET /api/cron/expire-proposals` hourly with `Authorization: Bearer $CRON_SECRET`
- `POST /api/cron/process-payment-balances` daily or hourly according to payment-ops policy with `Authorization: Bearer $CRON_SECRET`

`vercel.json` cron entries do not run on Render. `CRON_SECRET` in `render.yaml` is only an environment variable declaration, not a scheduled job.

## Required Staging Configuration

Classify each key before staging QA:

- `DATABASE_URL`: present, isolated staging DB, blocking if production DB
- `NEXTAUTH_URL`: staging URL, blocking if production URL
- `NEXTAUTH_SECRET`: present
- `NEXT_PUBLIC_BASE_URL`: staging URL
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: present for menu and request photos
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`: present, sender domain DNS verified
- `GOOGLE_GEOCODING_API_KEY`: present for production-grade radius matching
- `REDIS_URL` or `UPSTASH_REDIS_REST_URL` plus `UPSTASH_REDIS_REST_TOKEN`: present for checkout locks
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`: Stripe test-mode keys only in staging
- `CRON_SECRET`: present and shared only with scheduled callers
- `CHEFACHEF_HIGH_INTENT_THRESHOLD`: present or intentionally defaulted to `45`

## Geocoding Reconciliation

Run dry-run first:

```bash
node scripts/reconcile-geocoding.cjs --target=all --limit=50
```

Writes require explicit owner approval and a configured Google geocoding key:

```bash
node scripts/reconcile-geocoding.cjs --target=all --limit=50 --execute --owner-approved
```

Approximate local UK fallback coordinates are for testing only. Production writes refuse approximate fallback coordinates unless the environment is non-production and `--allow-approximate` is provided.

## Rue Recovery

Do not create another Rue account. Recovery requires:

1. Pre-2 September database backup or snapshot.
2. Temporary isolated restore.
3. Identification of the original Rue `User` and `ChefProfile`.
4. Foreign-key map for proposals, request invitations, messages, menus, experiences, bookings, reviews, notifications, payments, payouts, and audit logs.
5. Owner-approved targeted restoration plan.
6. Dry-run report before any write.

## Browser QA Checklist

- Chef profile photo upload, reload, and persistence.
- Menu creation with normal numeric values and menu image upload.
- Admin certificate view for valid certificates and safe invalid-reference display.
- Availability calendar default-available wording and blocked/booked/full states.
- Client request wizard Step 6 remains until explicit final submit, including Enter key behavior.
- Client notes persist and appear safely to eligible chefs.
- Request photos upload, reload, and appear only to authorized users.
- Immediate local request visibility, notification, and email on staging.
- Direct Request 48-hour exclusivity, early decline, expiry release, and no extra 24-hour hidden timer.
- Requests/Responded filters, Search This Area bounds, quote cap, privacy, and inactive-market payment guards.
