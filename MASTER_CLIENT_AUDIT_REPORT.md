# 1. Executive Summary

The client requested an evidence-based audit before broad implementation. I reviewed the repository, screenshots, supplied DOCX legal documents, Prisma schema, auth/email, Stripe/payment, country/currency, booking/request, multi-day, admin, and branding paths.

Currently working: the long cuisine/event lists exist; cuisine selection maxes at 3; selected public-wizard draft data is saved to `sessionStorage`; request creation persists cuisines/dietary data for authenticated clients; currency is mostly derived from centralized country options; a separate multi-day enquiry route exists; Stripe checkout is server-created.

Broken or incomplete: the public cuisine step labels the only forward action as `Skip`; registration sends no confirmation or verification email; `User.verified` is not enforced at login; the 20% platform commission exists but VAT/tax on the service fee is not calculated or stored; supplied UK/USA/privacy legal documents are not integrated; USA/Italy/Kenya appear technically active despite UK-first rollout; money fields use `Float`; multi-day cannot capture per-day cuisine/menu/dietary/budget; admin finance display lacks service-fee tax fields.

Needs decisions: whether proposal `price` means total client charge or chef gross; whether UK-only launch should hard-block USA/Italy/Kenya public transaction flows; multi-day data architecture; final legal versions and effective dates, especially the USA Terms future date.

# 2. Client Requirement Matrix

| Requirement | Client Expectation | Current State | Evidence | Files/Routes | Backend/API | DB Impact | Status | Recommended Action |
|---|---|---|---|---|---|---|---|---|
| 20% service charge | 20% in every enabled market | 20% commission helper exists | `PLATFORM_COMMISSION_RATE = 0.2` | `lib/marketplace-rules.ts:1` | Payment guarantee/webhook use helper | Current `Payment.commissionAmount` | WORKING for commission only | Keep centralized helper, rename semantics if needed |
| VAT/tax on service fee | service fee + country tax on service fee | Tax policies exist, not applied | invoice `taxAmount: 0`; payout uses commission only | `lib/invoice-service.ts:64`, `lib/payment-guarantee.ts:119` | Stripe charges proposal price only | Need new tax fields | BUG | Add authoritative server money breakdown |
| UK-first activation | UK active; future markets configured disabled | All 4 countries selectable and priced active | `supportedCountries = ["GB","US","KE","IT"]`; active pricing builders | `lib/service-engine.ts:11`, `:114`, `:185`, `:208`, `:231` | Request APIs accept supported country | May need country config fields/table | PARTIAL | Add market/payment/legal enable flags |
| Legal docs | Use supplied UK/USA Terms + Privacy | Site has summary terms, no market routing | Current pages are handcrafted summaries | `/terms/client`, `/terms/chef`, `/privacy` | Acceptance stores only one `TERMS_VERSION` | May need accepted document/version/country | PARTIAL | Integrate provided docs without rewriting legal copy |
| Cuisine bug | Selecting 1-3 cuisines gives clear Continue | Only forward CTA says `Skip` at cuisine step | Button label conditional `step === 7 ? "Skip" : "Next"` | `components/public/local-chef-discovery-wizard.tsx:559`, `:670-671` | Draft stores cuisines | No migration | BUG | Label forward CTA `Next`/`Continue` when selected; make skip explicit |
| Chef registration email | Automated confirmation email | No email send in register API | Register API creates user/profile only | `app/api/auth/register/route.ts` | None | Verification token needed | MISSING | Add email/verification pipeline |
| Client registration clarity | Clear success, email verification, preserve booking | Shows 2s success then redirects login; no verification | Success text says redirecting to login | `components/auth/RegisterForm.tsx:161` | callbackUrl preserved | Token fields exist but unused | PARTIAL | Add verified email state and draft-safe redirect UX |
| Transactional email | Reliable registration/verification + booking emails | Resend exists for requests/proposals/payouts; password reset TODO | `RESEND_API_KEY`; reset route TODO | `lib/email.ts:10`, `app/api/auth/reset-password/route.ts:51` | Notification worker exists | No registration token use | PARTIAL | Add templates and delivery checks |
| Multi-day | Non-consecutive dates and different day requirements | Separate multi-day enquiry exists; per-day model minimal | `MultiDayRequestDate` has `date`, times, `serviceNeeds` only | `prisma/schema.prisma:353` | `/api/requests/multi-day` | Booking remains single-date | PARTIAL | Choose architecture before schema migration |
| Lists | Longer cuisine/event list works | Lists exist and validation accepts them | `CUISINE_TYPES`, `EVENT_TYPE_OPTIONS` | `lib/request-options.ts:45`, `lib/service-engine.ts:21` | Request schema persists JSON | No new impact | WORKING/PARTIAL | Verify end-to-end after cuisine CTA fix |
| Admin | Show market, fee, tax, payout | Shows commission/chef net, not service-fee tax | Admin booking detail lists platform fee/chef net only | `app/dashboard/admin/bookings/[id]/page.tsx:101` | Analytics mostly separated by currency | Need tax fields | PARTIAL | Add tax/platform charge display after finance model fix |
| Currency | GBP/USD/EUR/KES by country, no FX mixing | Central formatter and per-currency analytics exist; some scalar totals remain | `getCurrencyForCountry`; `totalRevenue` scalar | `lib/service-engine.ts:693`, `app/dashboard/admin/page.tsx:104` | Request/proposal/payment currency stored | Existing currency fields | PARTIAL | Keep rows by currency; remove misleading scalar mixed totals |

# 3. Screenshot Audit

| Screenshot | Route | Component | Observed state | Client complaint | Root cause | Fix | Regression risk |
|---|---|---|---|---|---|---|---|
| Image #1 | `/dashboard/client/create-request` | `RequestWizardForm` | Multi-Day selected inside normal request form; single date/time in summary; mojibake separator in country/location | Multi-day appears single-date | Standard form lets tailored event be selected and walked through, then final schema blocks submit | Route multi-day event to dedicated flow earlier; fix separator encoding | Medium: normal one-day flow must remain intact |
| Image #2 | `/find-local-chef?location=London` | `LocalChefDiscoveryWizard` | 3 cuisines selected, footer has Back and Skip only | No continue button | CTA label hard-coded to `Skip` on step 7 despite selections | Show `Next`/`Continue with selections`; add separate skip action that clears/omits cuisines | Low |
| Image #3 | `/find-local-chef?location=London` | `LocalChefDiscoveryWizard` | Different 3 cuisines selected, same Back/Skip only | Same blocker | Same condition | Same fix; test max 3 and deselect/reselect | Low |

# 4. Legal Document Audit

UK Terms: supplied DOCX is UK Website/App Terms, states the site/app are for United Kingdom users only, references English law and English courts, and includes placeholders such as company number. Current website uses generic client/chef terms, not this content. Technical integration needs a UK legal route/version and registration/checkout links to UK terms for UK market. Legal confirmation needed for placeholders and whether UK Terms are only website/app terms or also booking terms.

USA Terms: supplied DOCX is USA Terms of Service for Clients/Chefs, includes marketplace role, Stripe payments, service fees, cancellations, chef obligations, California-specific clauses, arbitration/class waiver, and a “Last Updated: August 16, 2026” date. Since current date is August 11, 2026, that effective date is future-dated and needs client/legal confirmation before publication.

Privacy Policy: supplied DOCX covers UK/EU and United States, Stripe/payment data, SMS/WhatsApp/email, UK storage/transfers, GDPR and U.S./California rights. Current `/privacy` is a short summary and does not include the supplied policy details. Technical integration needs versioned privacy content and acceptance references.

# 5. Country Readiness Audit

| Country | Currency | Marketplace status | Service fee | Service-fee tax | Payment readiness | Legal readiness | Current implementation | Missing work |
|---|---|---|---|---|---|---|---|---|
| UK | GBP | Should be active first | 20% helper | 20% policy exists, not applied | Stripe enabled globally if env exists | Supplied, not integrated | Default country and pricing active | Apply tax formula, publish UK terms, country activation flag |
| USA | USD | Future/disabled until authorized | 20% helper | No rate supplied | Not country-gated | Supplied but future-dated | Selectable and priced active | Disable transactions; integrate terms after legal approval |
| Italy | EUR | Future/disabled | 20% helper | 22% policy exists, not applied | Not country-gated | Missing | Selectable and priced active | Legal/business approval and market flag |
| Kenya | KES | Future/disabled | 20% helper | 16% policy exists, not applied | Not country-gated | Missing | Selectable and priced active | Legal/business approval and market flag |

# 6. Financial Calculation Audit

Current formulas found:

- `calculatePlatformCommission(totalAmount) = totalAmount * 0.2`, rounded with `toFixed(2)` in `lib/marketplace-rules.ts:52`.
- `calculateChefPayout(totalAmount) = totalAmount - commission` in `lib/marketplace-rules.ts:56`.
- Stripe checkout charges `proposal.price` only via `unit_amount: Math.round(amount * 100)` in `app/api/payments/checkout/route.ts:164-184`.
- Payment records store `totalAmount`, `commissionAmount`, and `chefAmount` in `lib/payment-guarantee.ts:155-157`.
- Invoice receipt stores `taxAmount: 0` and only includes tax policy notes in `lib/invoice-service.ts:64-82`.
- Schema uses `Float` for `Proposal.price`, `Booking.totalPrice`, `Payment.totalAmount`, `commissionAmount`, `chefAmount`, `Invoice.taxAmount`, `Refund.amount`, and `Ledger.amount`.

Current UK example for booking/proposal amount 1000: client charged 1000, platform commission 200, service-fee tax 0, platform charge 200, chef net 800.

Required UK example: bookingAmount 1000, serviceFee 200, serviceFeeTax 40, platformCharge 240, chefNet 760.

Current Italy example for booking/proposal amount 1000: client charged 1000, platform commission 200, service-fee tax 0, platform charge 200, chef net 800.

Required Italy example: bookingAmount 1000, serviceFee 200, serviceFeeTax 44, platformCharge 244, chefNet 756.

Discrepancy: tax policy rates exist for GB/IT/KE but are informational; there is no authoritative tax calculation, no payment fields for service-fee tax/platform charge, and no Stripe/payment/payout/admin/receipt consistency for the required formula. The client’s UK wording inconsistency is real: the formula gives £240 platform charge while one sentence reportedly says £200; implementation should use the formula and flag the wording.

# 7. Cuisine Booking Bug Root Cause

Exact files: `components/public/local-chef-discovery-wizard.tsx`, `components/request-wizard-form.tsx`, `lib/validation-schemas.ts`, `lib/services/request-service.ts`.

Exact condition: on public step 7, the only forward footer button renders `{step === 7 ? "Skip" : "Next"}`. `canContinue` defaults to true for step 7, so it is clickable even with 0 selections. It advances with selected cuisines still in state, but the label communicates that selections will be skipped.

Skip behavior: technically it advances and does not clear selected cuisines, so it is not a true “open to suggestions” skip. This mismatch is the client-visible blocker.

Persistence: selected cuisines are saved to `sessionStorage` at `components/public/local-chef-discovery-wizard.tsx:126-144`, restored by dashboard form at `components/request-wizard-form.tsx:153-172`, validated min 1/max 3 by `lib/validation-schemas.ts:56`, and persisted as JSON by `lib/services/request-service.ts:214`.

Recommended minimal fix: make cuisine step show `Next`/`Continue with selected cuisines` when `selectedCuisines.length > 0`; provide a distinct `Skip` action that advances with no explicit cuisine preference or clearly preserves selected cuisines if that is intended. Then test 0, 1, 2, 3, attempted 4th, search, deselect/reselect, Back/return, anonymous/authenticated, desktop/mobile.

# 8. Registration & Verification Audit

CHEF REGISTRATION: account/profile creation works (`app/api/auth/register/route.ts`). No confirmation email is sent. Chef profile is created with pending compliance, but `User.verified` remains false and is not linked to an email-verification lifecycle. Signup success is a short message then login redirect.

CLIENT REGISTRATION: account creation works, `callbackUrl` is preserved through register/login (`components/auth/RegisterForm.tsx:27-47`, `:111-116`; `LoginForm.tsx:41-69`). Draft booking state is stored in browser `sessionStorage`, so it can survive registration/login in the same browser session but would not survive email verification on another device or cleared session. No verification callback, resend, expiry, invalid link, or login restriction exists.

Login behavior: credentials login checks email/password and ban status but not `verified` (`lib/auth.ts`). `User.verified` is used as a display/profile completion flag in other places, not an auth gate.

# 9. Transactional Email Audit

Provider: Resend via `lib/email.ts`; configured by `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.

Templates: new request, new proposal, proposal accepted, payment received, payment released. Missing registration confirmation, email verification, welcome, password reset email, chef approval/rejection email.

Current sends: request notifications (`request-service`), proposal notifications (`proposal-service`), payout release (`admin-payment-service`), preference-aware worker. Registration and password reset do not send email; reset route explicitly has TODO.

Required fixes: add verification token generation, Resend template, verify route, resend route, signup success UI, login restrictions for unverified users if business requires, and operational health checks that surface provider misconfiguration without exposing secrets.

# 10. Multi-Day Booking Architecture Audit

Current architecture: `Request` has `eventDate` plus optional JSON `eventDates`; `MultiDayRequestDate` stores per-date date/start/end/serviceNeeds; `Booking` remains single-date; `Proposal` has one price and one currency; checkout creates one `Booking` from request first date; availability checks all request dates when multiDayDates exist.

Single-date assumptions: `Booking.eventDate`, `Proposal.price`, `Booking.totalPrice`, dashboard date display, receipts, refunds, availability increments, and chef/client calendars assume one booking date. Multi-day payment can check multiple availability slots but stores only one `Booking.eventDate`.

Options:

| Option | Fit | Risk | Notes |
|---|---|---|---|
| A: one request with per-day service dates/details | Best product fit | Medium/high | Needs richer per-day schema and UI |
| B: one request, multiple dates, mostly shared requirements | Current partial fit | Medium | Does not meet different-menu/dietary per day |
| C: parent multi-day request with linked child requests/bookings per date | Best regression balance | Medium | Preserves existing single-day booking/payment logic while grouping UX |
| D: separate independent requests | Lowest build cost | Low | Poor UX, loses grouped context |

Recommendation: Option C. Use a parent multi-day request/enquiry for shared location/client/chef context and linked child service-day records or child requests that can each carry date, time, service type, cuisine, dietary needs, notes, and budget. This avoids forcing all existing Booking/payment/refund/admin code to become multi-date at once.

# 11. Branding Audit

Current orange: `--primary` and `--brand-primary` are `24 100% 55%`, approximately `#FF761A`, with `--brand-primary-hover` around duller/darker orange and `--brand-secondary` brown-orange (`app/globals.css:18-32`, `:79-93`). Gradients use `brand-primary` to `brand-accent`.

Hard-coded colors: many components use semantic `bg-primary`/`text-primary`; some admin/dashboard components use Tailwind `orange-*` for warning/status cards and should not be globally replaced. Auth forms also have hard-coded blue focus/link colors.

Recommended primary: `#FF5C00`, equivalent HSL near `22 100% 50%`. Use it at token level for brand primary/primary, then set hover to a darker accessible orange, and review `primary-foreground` because current foreground is near black; some components also force `text-white`.

Minimal strategy: update CSS variables only after contrast check, leave warning/status orange classes alone, then screenshot-test selected cuisine chips, primary buttons, logo, dashboards, and public nav.

# 12. Admin Dependency Audit

Required only due audited requirements: add columns/display for booking market/country, currency, service fee, service-fee tax, total platform charge, chef net; keep currency aggregates separate; show account verification state for users; show grouped multi-day parent/child dates once architecture is selected. Do not redesign admin dashboard.

# 13. Exact Files Requiring Changes

Frontend:

- `components/public/local-chef-discovery-wizard.tsx`: cuisine CTA and skip semantics; market availability UI.
- `components/request-wizard-form.tsx`: multi-day redirect/encoding fix; country market gating; finance copy.
- `components/multi-day-chef-hire-form.tsx`: budget type/per-day details after architecture decision.
- `components/auth/RegisterForm.tsx`, `components/auth/LoginForm.tsx`: verification UX, success state, resend links.
- `app/(public)/terms/**`, `app/(public)/privacy/page.tsx`, `components/public/public-footer.tsx`, registration/checkout links: legal document integration.

Backend/API:

- `lib/marketplace-rules.ts`: service fee/tax calculation helper.
- `app/api/payments/checkout/route.ts`, `lib/services/payment-guarantee.ts`, `lib/services/stripe-webhook-handler.ts`, instant payment routes, reconciliation/worker paths: authoritative amount breakdown.
- `lib/services/request-service.ts`, `app/api/requests/route.ts`, `app/api/requests/multi-day/route.ts`: country activation and multi-day model.
- `app/api/auth/register/route.ts`, new verify/resend routes, `lib/auth.ts`: email verification.

Database/schema:

- `prisma/schema.prisma`: payment/tax fields, market config or country flags, verification token fields if adapter model is insufficient, legal acceptance version/country fields, multi-day parent/child model.

Email:

- `lib/email.ts`, notification worker: templates and registration/password reset send integration.

Admin:

- `app/dashboard/admin/page.tsx`, `app/dashboard/admin/bookings/[id]/page.tsx`, `app/dashboard/admin/payments/page.tsx`, `app/dashboard/admin/commissions/page.tsx`, analytics routes/services: display service-fee tax/platform charge by currency.

Configuration:

- `lib/service-engine.ts`, `lib/request-options.ts`, `lib/currency.ts`: market enabled/payment/legal flags.

Tests:

- Add focused tests around cuisine flow, finance breakdown, verification, country gating, and multi-day architecture.

# 14. Database Changes

NO MIGRATION SHOULD BE RUN BEFORE DECISION APPROVAL.

Proposed migrations after approval:

- Add authoritative monetary fields to `Payment`: `serviceFeeAmount`, `serviceFeeTaxAmount`, `platformChargeAmount`, optionally `chefGrossAmount`/`moneyBreakdownVersion`; consider Decimal/cents fields instead of `Float`.
- Add `CountryMarketConfig` or equivalent config source with `marketplaceEnabled`, `paymentEnabled`, `serviceFeeRate`, `serviceFeeTaxRate`, legal versions, currency, locale.
- Extend legal acceptance to store accepted terms/privacy document versions and market/country.
- Add email verification token model/fields or reuse `VerificationToken` with explicit flow.
- For multi-day Option C, add parent/child request or grouped booking linkage.

# 15. Environment / External Service Requirements

Real env requirements found: `DATABASE_URL`/database URL variants; `NEXTAUTH_SECRET`; `NEXTAUTH_URL` or `NEXT_PUBLIC_BASE_URL`; `STRIPE_SECRET_KEY`; `STRIPE_WEBHOOK_SECRET`; optional `STRIPE_SUCCESS_URL`/`STRIPE_CANCEL_URL`; `RESEND_API_KEY`; `RESEND_FROM_EMAIL`; Redis/Upstash vars for queues/locks; Google Maps/geocoding key; Cloudinary keys; cron secret; Sentry/logging keys.

Do not print secret values. Health route already reports whether Stripe/email/auth env vars are present.

# 16. Implementation Priority

P0 — booking blockers / financial correctness: cuisine CTA semantics; service-fee-tax calculation design; prevent future-market transactions if UK-only launch is required.

P1 — registration/email verification: confirmation email, verification route, clearer signup state, resend flow, booking-state preservation.

P1 — legal/country readiness: integrate supplied UK/USA/privacy docs, versioned acceptance, market-specific routing.

P1/P2 — multi-day architecture: decide Option C vs A before migration.

P2 — branding polish: controlled `#FF5C00` token update with contrast checks.

P2 — admin dependent presentation: add tax/verification/multi-day fields after backend changes.

# 17. Regression Test Matrix

Test anonymous client booking, authenticated client booking, cuisine selection with 0/1/2/3/4 attempts, cuisine search/deselect/reselect, cuisine Skip, chef registration, client registration, email verification valid/expired/resend/already verified, UK request and checkout, UK fee/VAT, single-day booking, multi-day request once architecture is implemented, chef payout, client payment, admin financial display, refund/cancellation, desktop, mobile.

# 18. Before vs After

BEFORE: cuisine step shows `Skip` as only forward CTA; registration creates account without email; platform keeps 20% only; countries all selectable/active; legal pages are summaries; multi-day is an enquiry with shared details; brand orange is tokenized but duller than requested.

AFTER: not implemented yet per instruction. Proposed target: selected cuisines continue clearly; true skip means no preference; registration uses verification email; payment stores service fee/tax/platform charge/chef net; UK active and future markets configured disabled; supplied legal docs served by market/version; multi-day modeled with per-day requirements; brand primary updated through tokens.

UNCHANGED BEHAVIOR: standard one-day request, proposal, checkout, currency formatter, chef approval compliance, and existing admin modules should remain intact except where new fields are displayed.

# 19. Open Questions for Client

1. Should proposal `price` represent the total client-paid booking amount from which ChefaChef deducts service fee/tax, or the chef’s desired gross before platform charge is added?
2. Confirm the UK example wording: should platform charge be £240 on a £1,000 booking under the formula, despite the inconsistent £200 sentence?
3. Confirm whether USA/Italy/Kenya should be visible as “coming soon/enquiry only” or hidden until authorization.
4. Confirm legal publication details: UK company number, final effective dates, and whether the USA Terms dated August 16, 2026 should be published before that date.
5. For multi-day, choose the model: grouped parent with linked day bookings/requests is recommended, but confirm whether clients must be able to set different budget, menu, dietary, and time per day.

# 20. Phased Implementation Plan

PHASE A — Critical Booking Fixes: fix cuisine CTA/skip semantics; prevent normal request flow from walking multi-day users into a blocked submit; preserve draft state through auth.

PHASE B — Financial / Country Architecture: add server money breakdown, service-fee VAT/tax, country activation/payment/legal flags, currency-separated reporting.

PHASE C — Registration & Communication: implement confirmation/verification email, resend, callbacks, password reset email, and signup/login UX.

PHASE D — Legal Integration: publish client-provided UK/USA/privacy docs by market/version, update footer/register/checkout links, record acceptance versions.

PHASE E — Multi-Day Booking: implement approved architecture, preferably parent grouped request with child service-day records/bookings.

PHASE F — Branding: update tokenized primary orange to `#FF5C00`, leave warning/status colors alone, verify contrast.

PHASE G — QA: run full regression matrix, including mobile/desktop and payment/webhook paths.
