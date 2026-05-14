-- Migration 004: Add start_date to tours
BEGIN;
ALTER TABLE tours ADD COLUMN start_date DATE;
COMMIT;
