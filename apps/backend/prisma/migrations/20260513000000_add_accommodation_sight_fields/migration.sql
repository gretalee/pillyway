-- Migration: add_accommodation_sight_fields
-- Adds AccommodationType/PriceRange enums and the new columns introduced by PILLY-POI-001.
-- Existing accommodations rows receive type='hostel' automatically via the column DEFAULT.

-- CreateEnum: AccommodationType
CREATE TYPE "AccommodationType" AS ENUM ('hostel', 'monastery', 'b_and_b', 'hotel', 'apartment', 'private_room');

-- CreateEnum: PriceRange
CREATE TYPE "PriceRange" AS ENUM ('budget', 'moderate', 'comfortable', 'luxury');

-- AlterTable: accommodations — add type (NOT NULL with DEFAULT covers the backfill)
ALTER TABLE "accommodations"
  ADD COLUMN "type"            "AccommodationType" NOT NULL DEFAULT 'hostel',
  ADD COLUMN "email"           TEXT,
  ADD COLUMN "website"         TEXT,
  ADD COLUMN "address_street"  TEXT,
  ADD COLUMN "address_zip"     TEXT,
  ADD COLUMN "address_city"    TEXT,
  ADD COLUMN "address_country" TEXT,
  ADD COLUMN "price_range"     "PriceRange";

-- AlterTable: sights — add address, latitude, longitude
ALTER TABLE "sights"
  ADD COLUMN "address"   TEXT,
  ADD COLUMN "latitude"  DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;
