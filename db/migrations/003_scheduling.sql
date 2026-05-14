-- Migration 003: Scheduling fields for bookings and tour items
-- Run manually: psql -d maketrip -f db/migrations/003_scheduling.sql

BEGIN;

ALTER TABLE bookings
  ADD COLUMN start_time   TIME,
  ADD COLUMN booking_meta JSONB NOT NULL DEFAULT '{}';

ALTER TABLE tour_items
  ADD COLUMN scheduled_time TIME,
  ADD COLUMN end_day_number  INT;

COMMIT;
