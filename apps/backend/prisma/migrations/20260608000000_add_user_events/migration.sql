-- CreateTable
CREATE TABLE "user_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_name" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT,
    "entity_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "event_idempotency_key" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_events_event_name_check" CHECK (
        "event_name" IN (
            'user_registered',
            'user_logged_in',
            'camino_created',
            'camino_updated',
            'camino_voted',
            'camino_image_uploaded',
            'accommodation_created',
            'accommodation_updated',
            'sight_created',
            'sight_updated'
        )
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "user_events_event_name_event_idempotency_key_key" ON "user_events"("event_name", "event_idempotency_key");

-- CreateIndex
CREATE INDEX "user_events_event_name_occurred_at_idx" ON "user_events"("event_name", "occurred_at");

-- CreateIndex
CREATE INDEX "user_events_user_id_occurred_at_idx" ON "user_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "user_events_entity_type_entity_id_occurred_at_idx" ON "user_events"("entity_type", "entity_id", "occurred_at");
