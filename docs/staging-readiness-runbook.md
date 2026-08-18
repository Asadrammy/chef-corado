# ChefaChef Staging Readiness Runbook

This runbook is intentionally secret-free. Replace placeholder values in the
hosting dashboard only. Do not commit real environment values.

## Staging Environment Template

```bash
NODE_ENV=production
ENVIRONMENT=staging

DATABASE_URL=<render-staging-postgres-internal-url-with-pool-params>
DATABASE_PUBLIC_URL=<optional-render-staging-postgres-external-url-if-needed>
EXTERNAL_DATABASE_URL=<optional-render-staging-postgres-external-url-if-needed>
DIRECT_DATABASE_URL=<optional-direct-staging-postgres-url>

NEXTAUTH_URL=https://<chefachef-staging-service>.onrender.com
NEXTAUTH_SECRET=<staging-nextauth-secret>
NEXT_PUBLIC_BASE_URL=https://<chefachef-staging-service>.onrender.com

RESEND_API_KEY=<resend-staging-api-key>
RESEND_FROM_EMAIL=ChefaChef <info@chefachef.com>

STRIPE_SECRET_KEY=<stripe-test-secret-key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe-test-publishable-key>
STRIPE_WEBHOOK_SECRET=<stripe-test-webhook-signing-secret>

CRON_SECRET=<staging-cron-secret>

IMAGE_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=<cloudinary-staging-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-staging-api-key>
CLOUDINARY_API_SECRET=<cloudinary-staging-api-secret>

UPSTASH_REDIS_REST_URL=<upstash-staging-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-staging-rest-token>
# Or use REDIS_URL instead of Upstash REST:
# REDIS_URL=<staging-redis-url>

API_TIMEOUT_MS=30000
MAX_REQUEST_SIZE=10mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://<chefachef-staging-service>.onrender.com
ALLOWED_ORIGINS=https://<chefachef-staging-service>.onrender.com

CHEF_QUOTES_TARGET=10
CHEF_MENUS_TARGET=5
```

## Render Setup

1. Create a separate Render web service named `chefachef-staging`.
2. Create a separate Render PostgreSQL database named `chefachef-staging-postgres`.
3. Connect the staging web service only to the staging database.
4. Use `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` as the build flow.
5. Use `npm start` as the start command.
6. Set all environment variables from the staging template in Render.
7. Do not copy production `DATABASE_URL` into staging.

## External Service Setup

Stripe:
- Use TEST mode keys only.
- Add webhook endpoint `https://<chefachef-staging-service>.onrender.com/api/payments/webhook`.
- Subscribe at minimum to Checkout Session, PaymentIntent, SetupIntent, Charge, Refund, Dispute, and Payout events used by the app.
- Copy the TEST webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

Cloudinary:
- Use a staging cloud, folder, or account dedicated to non-production uploads.
- Set `IMAGE_STORAGE_PROVIDER=cloudinary`.
- Verify profile photo and menu image uploads return `https://res.cloudinary.com/...` secure URLs.

Redis / Upstash:
- Create a staging Redis or Upstash instance.
- Set either `UPSTASH_REDIS_REST_URL` plus `UPSTASH_REDIS_REST_TOKEN`, or `REDIS_URL`.
- Verify production-mode checkout locks fail closed when Redis is absent and work when Redis is present.

Resend:
- Use a verified sender authorized for `info@chefachef.com` or an approved staging sender.
- Verify registration, resend verification, split bill invitation, chef review, and payment recovery emails.

Cron:
- Configure a scheduler to POST `/api/cron/process-payment-balances`.
- Send header `Authorization: Bearer <CRON_SECRET>`.
- Do not expose the cron secret in client code.

## Database Backup Prerequisites

Before applying migrations to staging:
1. Confirm database name, host, and owning service are staging-only.
2. Capture a PostgreSQL backup or Render snapshot.
3. Record the current migration table state with read-only inspection.
4. Run `npx prisma migrate deploy` only after identity and backup are confirmed.

## Staging E2E Checklist

Chef:
- Register.
- Verify email.
- Log in.
- Complete pending profile: first name, surname, photo, career stage, specialties, certificates, menu image, long description.
- Save and reload.

Admin:
- Open pending application.
- Inspect profile and certificates.
- Request changes.
- Approve one complete chef.
- Reject a disposable applicant.
- Verify audit logs.
- Verify `User.verified` remains independent from chef approval.

Client:
- Register.
- Verify email.
- Complete booking wizard.
- Validate cuisine Skip/Next and maximum 3 cuisines.
- Create standard booking and Multi-Day booking.
- Confirm one chef is used for all selected Multi-Day dates.
- Review proposal and enter checkout.

Payments:
- Full Payment.
- 20% Deposit.
- 80% balance due 30 days before earliest service date.
- Balance failure moves to `RECOVERY_REQUIRED` without cancelling booking.
- Manual balance recovery checkout.
- Split Bill.
- Main-client guarantor shortfall.
- Add Guests with chef approval where no explicit per-person rate exists.
- Reduce Guests via admin/refund path only.

Security and RBAC:
- Verify client, chef, and admin cannot access each other's restricted routes.
- Verify cron rejects missing or incorrect `CRON_SECRET`.
- Verify production-mode missing Cloudinary and missing Redis fail closed.
