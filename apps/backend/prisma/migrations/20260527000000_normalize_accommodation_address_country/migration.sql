-- Normalize address_country values to match the COUNTRIES allow-list
-- (PascalCase, e.g. 'Germany'). Previous seeds stored ISO codes ('DE')
-- or full German names ('Deutschland'). Idempotent — safe to re-run.
UPDATE "accommodations"
SET "address_country" = 'Germany'
WHERE "address_country" IN ('DE', 'Deutschland', 'germany');
