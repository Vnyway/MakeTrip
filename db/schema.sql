-- MakeTrip MVP schema (PostgreSQL, schema: public)
-- Database name: maketrip (create separately: CREATE DATABASE maketrip;)
-- Requires PostgreSQL 13+ for gen_random_uuid()
--
-- tour_items rationale: A "tour" here is a user's private itinerary (constructor output).
--   services = catalog offerings; tour_items link many services into one ordered plan:
--   day_number, slot order, qty, notes — metadata that belongs to the PLAN line, not the service row.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE user_status AS ENUM ('active', 'blocked', 'deleted');

CREATE TYPE service_status AS ENUM ('draft', 'active', 'inactive');

CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

CREATE TYPE interaction_type AS ENUM ('view', 'click', 'favorite_add', 'favorite_remove', 'booking', 'review');

-- ---------------------------------------------------------------------------
-- Users & roles
-- ---------------------------------------------------------------------------

CREATE TABLE roles (
    id          SMALLSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                VARCHAR(255) NOT NULL UNIQUE,
    password_hash        VARCHAR(255) NOT NULL,
    is_email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    status               user_status NOT NULL DEFAULT 'active',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at        TIMESTAMPTZ
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id SMALLINT NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX ix_user_roles_role ON user_roles (role_id);

-- ---------------------------------------------------------------------------
-- Geography
-- ---------------------------------------------------------------------------

CREATE TABLE countries (
    id        SERIAL PRIMARY KEY,
    iso_code  CHAR(2) NOT NULL UNIQUE,
    name      VARCHAR(120) NOT NULL
);

CREATE TABLE cities (
    id          BIGSERIAL PRIMARY KEY,
    country_id  INT NOT NULL REFERENCES countries (id) ON DELETE RESTRICT,
    name        VARCHAR(120) NOT NULL,
    latitude    NUMERIC(9, 6),
    longitude   NUMERIC(9, 6),
    UNIQUE (country_id, name)
);

CREATE INDEX ix_cities_country ON cities (country_id);

-- ---------------------------------------------------------------------------
-- Catalog: base service + typed extensions (1:1)
-- ---------------------------------------------------------------------------

CREATE TABLE services (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    country_id       INT NOT NULL REFERENCES countries (id) ON DELETE RESTRICT,
    city_id          BIGINT NOT NULL REFERENCES cities (id) ON DELETE RESTRICT,
    price_usd        NUMERIC(12, 2) NOT NULL CHECK (price_usd >= 0),
    status           service_status NOT NULL DEFAULT 'draft',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_services_geo_price ON services (country_id, city_id, price_usd);
CREATE INDEX ix_services_status ON services (status);

CREATE TABLE hotels (
    service_id UUID PRIMARY KEY REFERENCES services (id) ON DELETE CASCADE,
    stars      SMALLINT CHECK (stars IS NULL OR (stars >= 1 AND stars <= 5)),
    address    VARCHAR(500)
);

CREATE TABLE restaurants (
    service_id UUID PRIMARY KEY REFERENCES services (id) ON DELETE CASCADE,
    cuisine    VARCHAR(120)
);

CREATE TABLE flights (
    service_id           UUID PRIMARY KEY REFERENCES services (id) ON DELETE CASCADE,
    origin_city_id       BIGINT NOT NULL REFERENCES cities (id) ON DELETE RESTRICT,
    destination_city_id  BIGINT NOT NULL REFERENCES cities (id) ON DELETE RESTRICT,
    airline              VARCHAR(120),
    depart_at            TIMESTAMPTZ,
    arrive_at            TIMESTAMPTZ,
    CONSTRAINT flights_distinct_route CHECK (origin_city_id <> destination_city_id)
);

CREATE TABLE activities (
    service_id        UUID PRIMARY KEY REFERENCES services (id) ON DELETE CASCADE,
    activity_kind     VARCHAR(80) NOT NULL, -- e.g. excursion, museum_ticket, cinema, theater
    duration_minutes  INT CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

CREATE TABLE service_media (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id  UUID NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    media_type  VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    s3_url      TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX ix_service_media_service ON service_media (service_id);

-- Full-text search (English) on catalog
ALTER TABLE services
    ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector(
                'english',
                coalesce(title, '') || ' ' || coalesce(description, '')
            )
        ) STORED;

CREATE INDEX ix_services_search ON services USING GIN (search_vector);

-- ---------------------------------------------------------------------------
-- Private trip plans (constructor only — not a public catalog)
-- ---------------------------------------------------------------------------

CREATE TABLE tours (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_tours_user ON tours (user_id);

CREATE TABLE tour_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id     UUID NOT NULL REFERENCES tours (id) ON DELETE CASCADE,
    service_id  UUID NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
    day_number  INT NOT NULL CHECK (day_number >= 1),
    position    INT NOT NULL DEFAULT 0,
    quantity    INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    note        TEXT,
    UNIQUE (tour_id, day_number, position)
);

CREATE INDEX ix_tour_items_tour ON tour_items (tour_id);
CREATE INDEX ix_tour_items_service ON tour_items (service_id);

-- ---------------------------------------------------------------------------
-- Interactions (MVP: services only — no catalog tours, no shared trips)
-- ---------------------------------------------------------------------------

CREATE TABLE favorites (
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    service_id  UUID NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, service_id)
);

CREATE TABLE bookings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    service_id    UUID NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    persons_count INT NOT NULL CHECK (persons_count >= 1),
    total_price_usd NUMERIC(12, 2) NOT NULL CHECK (total_price_usd >= 0),
    status        booking_status NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bookings_date_order CHECK (end_date >= start_date)
);

CREATE INDEX ix_bookings_user ON bookings (user_id);
CREATE INDEX ix_bookings_service ON bookings (service_id);

CREATE TABLE reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    service_id   UUID NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, service_id)
);

CREATE INDEX ix_reviews_service ON reviews (service_id);

CREATE TABLE user_interactions (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    service_id           UUID NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    interaction_type     interaction_type NOT NULL,
    weight               NUMERIC(8, 3),
    meta                 JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_user_interactions_user_time ON user_interactions (user_id, created_at DESC);
CREATE INDEX ix_user_interactions_service_time ON user_interactions (service_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Personalization
-- ---------------------------------------------------------------------------

CREATE TABLE user_preferences (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    preference_key     VARCHAR(80) NOT NULL,  -- e.g. activity_kind, budget_max_usd
    preference_value   TEXT NOT NULL,        -- or JSON string; app layer interprets
    weight             NUMERIC(4, 3) NOT NULL DEFAULT 1.000 CHECK (weight >= 0 AND weight <= 1),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, preference_key)
);

CREATE TABLE user_similarity (
    user_id           UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    similar_user_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    score             NUMERIC(8, 6) NOT NULL CHECK (score >= 0 AND score <= 1),
    calculated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, similar_user_id),
    CONSTRAINT user_similarity_no_self CHECK (user_id <> similar_user_id)
);

CREATE INDEX ix_user_similarity_user ON user_similarity (user_id);

-- Precomputed candidates (pairs with offline job); API still applies filters.
CREATE TABLE recommendations (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    service_id      UUID NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    score           NUMERIC(12, 6) NOT NULL,
    reason          TEXT,
    model_version   VARCHAR(50),
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ
);

CREATE INDEX ix_recommendations_user_generated ON recommendations (user_id, generated_at DESC);
CREATE INDEX ix_recommendations_user_service ON recommendations (user_id, service_id);

COMMIT;
