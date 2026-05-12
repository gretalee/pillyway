-- Backfill Stage rows for Caminos created before eager stage creation was introduced.
-- For every consecutive camino_point_order pair that has no Stage row, insert one
-- with null distance/description. ON CONFLICT DO NOTHING makes this idempotent.
INSERT INTO "stages" ("id", "start_point_id", "end_point_id", "distance", "description", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    cpo1."camino_point_id",
    cpo2."camino_point_id",
    NULL,
    NULL,
    NOW(),
    NOW()
FROM "camino_point_order" cpo1
JOIN "camino_point_order" cpo2
    ON  cpo1."camino_id" = cpo2."camino_id"
    AND cpo2."position"  = cpo1."position" + 1
WHERE NOT EXISTS (
    SELECT 1
    FROM "stages" s
    WHERE s."start_point_id" = cpo1."camino_point_id"
      AND s."end_point_id"   = cpo2."camino_point_id"
)
ON CONFLICT ("start_point_id", "end_point_id") DO NOTHING;
