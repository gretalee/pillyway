-- Normalize country values to the lowercase COUNTRIES allow-list.
-- Covers accommodations.address_country and camino_points.country.
-- Idempotent — safe to re-run.

UPDATE "accommodations"
SET "address_country" = 'germany'
WHERE "address_country" IN ('DE', 'Deutschland', 'Germany');

UPDATE "accommodations"
SET "address_country" = 'poland'
WHERE "address_country" IN ('PL', 'Polen', 'Poland');

-- Normalize camino_points.country from any PascalCase variant to lowercase.
UPDATE "camino_points"
SET "country" = LOWER("country")
WHERE "country" IN ('Denmark', 'France', 'Germany', 'Italy', 'Netherlands', 'Poland', 'Portugal', 'Spain', 'Sweden');
