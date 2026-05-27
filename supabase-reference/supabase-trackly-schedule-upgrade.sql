-- =========================================================================
-- TRACKLY V3 - UPGRADE: REMOVE SINGLE SHIFT CONSTRAINT TO SUPPORT MULTIPLE SHIFTS
-- =========================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- This script drops the unique user-date schedule constraint, enabling multiple shift blocks per calendar date.
-- =========================================================================

-- 1. DROP THE UNIQUE CONSTRAINT
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS unique_user_date_schedule;

-- 2. VERIFY BY SHOWING ALTERS (OPTIONAL VERIFICATION)
COMMENT ON TABLE public.schedules IS 'Workspace scheduling shifts table, supporting multiple shifts per calendar date.';
