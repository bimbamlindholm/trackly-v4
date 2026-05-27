-- TRACKLY V3 - CUSTOM HOLIDAY MULTIPLIERS MIGRATION
-- This script adds customizable multiplier rate columns to the public.workspaces table.

ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS holiday_regular_rate numeric DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS holiday_special_rate numeric DEFAULT 1.3,
  ADD COLUMN IF NOT EXISTS night_diff_rate numeric DEFAULT 0.10;

COMMENT ON COLUMN public.workspaces.holiday_regular_rate IS 'Multiplier for Regular Holidays (default 2.0 for double pay)';
COMMENT ON COLUMN public.workspaces.holiday_special_rate IS 'Multiplier for Special Non-Working Days (default 1.3 for 130% pay)';
COMMENT ON COLUMN public.workspaces.night_diff_rate IS 'Premium rate multiplier for Night Differential (default 0.10 for 10% premium)';
