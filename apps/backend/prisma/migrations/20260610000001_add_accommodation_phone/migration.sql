ALTER TABLE "accommodations" ADD COLUMN "phone" VARCHAR(30);

-- Seed phone numbers extracted from existing descriptions.
-- The regex matches an optional leading + followed by at least 7 phone-like characters
-- (digits, spaces, hyphens, parentheses, dots) ending on a digit.
UPDATE "accommodations"
SET "phone" = trim((regexp_match("description", '(\+?[0-9][0-9 \-\(\)\.]{5,23}[0-9])'))[1])
WHERE "description" ~ '(\+?[0-9][0-9 \-\(\)\.]{5,23}[0-9])'
  AND "phone" IS NULL;
