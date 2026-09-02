# Staging Auth Diagnostics

Use these utilities only against staging databases. They never print passwords or
stored password hashes.

## Diagnose One Account

```bash
node scripts/staging-auth-diagnostic.cjs --email user@example.com
```

The report shows whether the normalized email exists, role, verification and
ban flags, password-hash presence, profile relationship status, duplicate
normalized email count, and safe database host/name identifiers.

## Reconcile A Staging Simulation Account

```bash
ALLOW_STAGING_ACCOUNT_RECONCILIATION=true \
APP_ENV=staging \
STAGING_ACCOUNT_EMAIL=user@example.com \
STAGING_ACCOUNT_ROLE=CHEF \
STAGING_ACCOUNT_PASSWORD="provided-out-of-band" \
node scripts/staging-account-reconcile.cjs
```

The reconcile command refuses to run unless the environment is identifiable as
staging. It updates or creates a `CHEF` or `CLIENT` user, marks the user verified
and unbanned, and for chef accounts creates or repairs the required
`ChefProfile` relationship. Never run this against production.
