-- Migration 002: Tags system
-- Run manually: psql -d maketrip -f db/migrations/002_tags.sql

BEGIN;

CREATE TABLE tags (
    id     SMALLSERIAL PRIMARY KEY,
    slug   VARCHAR(50)  NOT NULL UNIQUE,
    label  VARCHAR(100) NOT NULL
);

INSERT INTO tags (slug, label) VALUES
  ('relaxation',  'Relaxation'),
  ('adventure',   'Adventure'),
  ('romantic',    'Romantic'),
  ('family',      'Family'),
  ('cultural',    'Cultural'),
  ('beach',       'Beach & Sea'),
  ('mountains',   'Mountains'),
  ('city',        'City'),
  ('nature',      'Nature'),
  ('islands',     'Islands'),
  ('sightseeing', 'Sightseeing'),
  ('wellness',    'Wellness & Spa'),
  ('active',      'Active Sports'),
  ('gastronomy',  'Gastronomy'),
  ('nightlife',   'Nightlife'),
  ('shopping',    'Shopping');

CREATE TABLE service_tags (
    service_id  UUID     NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    tag_id      SMALLINT NOT NULL REFERENCES tags (id)     ON DELETE CASCADE,
    PRIMARY KEY (service_id, tag_id)
);

CREATE INDEX ix_service_tags_tag ON service_tags (tag_id);

-- Drop the user_preferences table (replaced by implicit tag inference)
DROP TABLE IF EXISTS user_preferences;

COMMIT;
