-- Implementation Pass 3: clarify future-market pricing evidence notes.
-- Forward-only data correction. Keeps historical migration checksums stable.

UPDATE "ServicePricingRule"
SET "evidenceNotes" = CASE "countryCode"
  WHEN 'US' THEN 'Client supplied USA pricing guidance for future market readiness. This pricing row does not activate USA bookings or checkout.'
  WHEN 'IT' THEN 'Client supplied Italy pricing guidance for future market readiness. This pricing row does not activate Italy bookings or checkout. No Italy minimum spend was supplied.'
  WHEN 'KE' THEN 'Client supplied Kenya pricing guidance for future market readiness. This pricing row does not activate Kenya bookings or checkout.'
  ELSE "evidenceNotes"
END
WHERE "countryCode" IN ('US', 'IT', 'KE')
  AND "version" = 'system-client-requirements-2026-08-10';

