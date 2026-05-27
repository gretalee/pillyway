-- Normalize address_country values to match the COUNTRIES allow-list
-- (lowercase, e.g. 'germany'). Previous seeds stored ISO codes ('DE'),
-- full German names ('Deutschland'), or PascalCase ('Germany'). Idempotent — safe to re-run.
UPDATE "accommodations"
SET "address_country" = 'germany'
WHERE "address_country" IN ('DE', 'Deutschland', 'Germany');

UPDATE "accommodations"
SET "address_country" = 'poland'
WHERE "address_country" IN ('PL', 'Polen', 'Poland');
