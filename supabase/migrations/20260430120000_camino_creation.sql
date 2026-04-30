-- Migration: camino_creation
-- Ticket: PILLY-CAM-001
-- Created: 2026-04-30

-- ─── 1. caminos ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS caminos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  verified    BOOLEAN     NOT NULL DEFAULT false,
  created_by  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. camino_points ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS camino_points (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  country     TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT camino_points_name_country_unique UNIQUE (name, country)
);

-- ─── 3. camino_point_order ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS camino_point_order (
  camino_id        UUID    NOT NULL REFERENCES caminos(id)        ON DELETE CASCADE,
  camino_point_id  UUID    NOT NULL REFERENCES camino_points(id)  ON DELETE CASCADE,
  position         INTEGER NOT NULL,
  CONSTRAINT camino_point_order_pk PRIMARY KEY (camino_id, camino_point_id)
);

-- ─── 4. Indexes ───────────────────────────────────────────────────────────────

-- Unique constraint on lower-cased camino name — prevents duplicates and makes
-- the RPC uniqueness guard race-safe (two concurrent inserts: one succeeds, one
-- hits this constraint and the RPC returns 409).
CREATE UNIQUE INDEX IF NOT EXISTS idx_caminos_lower_name_unique
  ON caminos (LOWER(name));

-- Trigram GIN index for efficient ILIKE '%term%' search on camino_points.name.
-- text_pattern_ops cannot accelerate leading-wildcard patterns; pg_trgm can.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_camino_points_name_trgm
  ON camino_points USING GIN (name gin_trgm_ops);

-- Ordered point retrieval for a given camino
CREATE INDEX IF NOT EXISTS idx_camino_point_order_camino_position
  ON camino_point_order (camino_id, position);

-- ─── 5. Row-Level Security ───────────────────────────────────────────────────

ALTER TABLE caminos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE camino_points     ENABLE ROW LEVEL SECURITY;
ALTER TABLE camino_point_order ENABLE ROW LEVEL SECURITY;

-- Public read; all writes go through the NestJS backend via service-role key
CREATE POLICY "caminos_public_read"
  ON caminos FOR SELECT USING (true);

CREATE POLICY "camino_points_public_read"
  ON camino_points FOR SELECT USING (true);

CREATE POLICY "camino_point_order_public_read"
  ON camino_point_order FOR SELECT USING (true);

-- ─── 6. create_camino RPC function ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_camino(
  p_name        TEXT,
  p_description TEXT,
  p_created_by  TEXT,
  p_points      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_camino_id UUID;
  v_point     JSONB;
  v_point_id  UUID;
  v_position  INT := 1;
  v_result    JSONB;
BEGIN
  -- Guard: case-insensitive camino name uniqueness
  IF EXISTS (SELECT 1 FROM caminos WHERE lower(name) = lower(p_name)) THEN
    RAISE EXCEPTION 'CAMINO_NAME_EXISTS';
  END IF;

  -- Guard: intra-request duplicate points (new-point definitions only)
  IF (
    SELECT COUNT(*) FROM (
      SELECT LOWER(point->>'name') AS n, LOWER(point->>'country') AS c
      FROM jsonb_array_elements(p_points) point
      WHERE point->>'caminoPointId' IS NULL
      GROUP BY 1, 2
      HAVING COUNT(*) > 1
    ) dupes
  ) > 0 THEN
    RAISE EXCEPTION 'DUPLICATE_POINT_IN_REQUEST';
  END IF;

  INSERT INTO caminos (name, description, verified, created_by)
  VALUES (p_name, p_description, false, p_created_by)
  RETURNING id INTO v_camino_id;

  FOR v_point IN SELECT * FROM jsonb_array_elements(p_points)
  LOOP
    IF v_point ? 'caminoPointId' THEN
      v_point_id := (v_point->>'caminoPointId')::UUID;
      IF NOT EXISTS (SELECT 1 FROM camino_points WHERE id = v_point_id) THEN
        RAISE EXCEPTION 'CAMINO_POINT_NOT_FOUND:%', v_point_id;
      END IF;
    ELSE
      INSERT INTO camino_points (name, country, description)
      VALUES (v_point->>'name', v_point->>'country', v_point->>'description')
      ON CONFLICT (name, country) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO v_point_id;
    END IF;

    INSERT INTO camino_point_order (camino_id, camino_point_id, position)
    VALUES (v_camino_id, v_point_id, v_position);

    v_position := v_position + 1;
  END LOOP;

  SELECT jsonb_build_object(
    'id',          c.id,
    'name',        c.name,
    'description', c.description,
    'verified',    c.verified,
    'caminoPoints', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',       cp.id,
          'name',     cp.name,
          'country',  cp.country,
          'position', cpo.position
        )
        ORDER BY cpo.position
      )
      FROM camino_point_order cpo
      JOIN camino_points cp ON cp.id = cpo.camino_point_id
      WHERE cpo.camino_id = c.id
    )
  )
  INTO v_result
  FROM caminos c
  WHERE c.id = v_camino_id;

  RETURN v_result;
END;
$$;

-- Restrict EXECUTE to service_role only — prevents anon/authenticated keys from
-- calling this function directly and bypassing NestJS auth guards.
REVOKE EXECUTE ON FUNCTION create_camino(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION create_camino(TEXT, TEXT, TEXT, JSONB) TO service_role;
