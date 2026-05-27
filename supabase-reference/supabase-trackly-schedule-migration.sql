-- =========================================================================
-- TRACKLY V3 - OPTION D: SHIFT SCHEDULER & VISUAL CALENDAR MIGRATION
-- =========================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- This script creates the schedules table, sets indexes, and applies policies.
-- =========================================================================

-- 1. CREATE SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_start TEXT NOT NULL, -- Format: 'HH:MM' (24-hour format)
  shift_end TEXT NOT NULL,   -- Format: 'HH:MM' (24-hour format)
  label TEXT NOT NULL DEFAULT 'Day Shift',
  color TEXT NOT NULL DEFAULT '#06b6d4',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent multiple scheduling entries for a single employee on the same date
  CONSTRAINT unique_user_date_schedule UNIQUE (user_id, date)
);

-- 2. ENABLE ROW-LEVEL SECURITY
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- 3. CREATE RLS POLICIES FOR WORKSPACE MEMBERS AND OWNER
DROP POLICY IF EXISTS "Allow select schedules for authenticated users" ON public.schedules;
CREATE POLICY "Allow select schedules for authenticated users"
  ON public.schedules
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all mutations on schedules for authenticated users" ON public.schedules;
CREATE POLICY "Allow all mutations on schedules for authenticated users"
  ON public.schedules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. GRANT PERMISSIONS TO AUTHENTICATED AND ANON ROLES
GRANT ALL ON public.schedules TO authenticated, anon;
