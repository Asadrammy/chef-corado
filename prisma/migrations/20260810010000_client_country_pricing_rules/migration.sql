WITH service_bounds("serviceType", "minGuests", "maxGuests", "kenyaMinimumSpend") AS (
  VALUES
    ('THREE_COURSE_MEAL', 2, 200, 10000),
    ('FOUR_FIVE_COURSE_MEAL', 2, 200, 10000),
    ('SIX_NINE_COURSE_MEAL', 2, 120, 10000),
    ('SHARING_PLATES', 4, 200, 20000),
    ('SHARING_BUFFET', 6, 250, 20000),
    ('CANAPES_AND_DRINKS', 6, 300, 20000),
    ('BARBECUE_BBQ', 4, 250, 20000),
    ('BRUNCH', 2, 150, 10000),
    ('GRAZING_TABLE', 4, 250, 20000),
    ('COOKING_CLASS', 2, 20, 10000),
    ('AFTERNOON_TEA', 2, 120, 10000),
    ('KIDS_PARTY', 2, 150, 20000),
    ('DELIVERY_PLATTER', 2, 300, 10000)
),
country_rules("countryCode", "currency", "minimumSpend", "pricePerPersonMin", "pricePerPersonMax", "customerGuidance", "warningCopy", "evidenceNotes") AS (
  VALUES
    (
      'US',
      'USD',
      500,
      57,
      99,
      'Per-person event rates usually start around $57 to $99+ per head. General cooking and prep assistance is $40-$60/hour. Multi-day or daily rates range from $300 to $3,000 per day depending on holiday, scale, and chef scope.',
      'Your budget is below the client-confirmed USA guidance of $500 minimum spend or $75 per person.',
      'Client confirmed USA online bookings, $500 or $75pp minimum guidance, $57-$99+ per-person event rates, $40-$60/hour assistance, and $300-$3,000/day multi-day rates.'
    ),
    (
      'IT',
      'EUR',
      NULL,
      48,
      100,
      'Event-based private chef bookings average around EUR 770 for 10 guests. Italian menus start around EUR 48 per person, Middle Eastern around EUR 38 per person, and Fine Dining or Pan-Asian range from EUR 65 to EUR 100+ per person. Occasional cooking ranges from EUR 18-EUR 40/hour and multi-day helper rates range from EUR 200-EUR 1,500/day.',
      NULL,
      'Client confirmed Italy online bookings, EUR 770 average for 10 guests, menu guidance from EUR 38-EUR 100+ per person, EUR 18-EUR 40/hour, and EUR 200-EUR 1,500/day. No Italy minimum spend was supplied.'
    ),
    (
      'KE',
      'KES',
      NULL,
      2500,
      4000,
      'Intimate home dining for 2-8 guests is KES 10,000-KES 15,000 flat or KES 2,500-KES 4,000 per person. House parties and small events for 9-15 guests start at KES 20,000+. On-demand chef time is KES 2,000/hour with a typical 3-4 hour minimum. Weekly meal prep starts at KES 15,000+.',
      NULL,
      'Client confirmed Kenya online bookings, deposit expectations, ingredient/grocery-float handling, and category-specific KES guidance.'
    )
)
INSERT INTO "ServicePricingRule" (
  "id",
  "serviceType",
  "countryCode",
  "currency",
  "tier",
  "minGuests",
  "maxGuests",
  "minimumSpend",
  "pricePerPersonMin",
  "pricePerPersonMax",
  "customerGuidance",
  "warningCopy",
  "evidenceSource",
  "evidenceNotes",
  "status",
  "version",
  "effectiveFrom",
  "reviewedBy",
  "reviewedAt",
  "activatedBy",
  "activatedAt",
  "lifecycleReason",
  "childrenRuleSummary",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt"
)
SELECT
  lower(s."serviceType") || '_' || lower(c."currency") || '_2026_08_10_active',
  s."serviceType",
  c."countryCode",
  c."currency",
  NULL,
  s."minGuests",
  s."maxGuests",
  CASE WHEN c."countryCode" = 'KE' THEN s."kenyaMinimumSpend" ELSE c."minimumSpend" END,
  c."pricePerPersonMin",
  c."pricePerPersonMax",
  c."customerGuidance",
  CASE
    WHEN c."countryCode" = 'KE' THEN 'Your budget is below the client-confirmed Kenya guidance of ' || s."kenyaMinimumSpend" || ' KES for this service category.'
    ELSE c."warningCopy"
  END,
  'CLIENT REQUIREMENTS 10 AUGUST 2026.docx',
  c."evidenceNotes",
  'ACTIVE',
  '2026-08-10-client-confirmed',
  '2026-08-10T00:00:00.000Z'::timestamp,
  'system-client-requirements-2026-08-10',
  '2026-08-10T00:00:00.000Z'::timestamp,
  'system-client-requirements-2026-08-10',
  '2026-08-10T00:00:00.000Z'::timestamp,
  'Client confirmed US, Italy, and Kenya online booking pricing in CLIENT REQUIREMENTS 10 AUGUST 2026.docx.',
  'Every two kids under 10 years old will be equated to one adult and will be charged as such.',
  'system-client-requirements-2026-08-10',
  'system-client-requirements-2026-08-10',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM service_bounds s
CROSS JOIN country_rules c
WHERE NOT EXISTS (
  SELECT 1
  FROM "ServicePricingRule" existing
  WHERE existing."id" = lower(s."serviceType") || '_' || lower(c."currency") || '_2026_08_10_active'
);
