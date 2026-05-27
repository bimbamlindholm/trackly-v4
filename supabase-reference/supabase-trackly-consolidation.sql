-- =========================================================================
-- TRACKLY V3 - CONSOLIDATED DATABASE SYNC MIGRATION & RLS PATCH
-- =========================================================================
-- Run this full script in your Supabase SQL Editor (https://supabase.com)
-- This script fixes:
--   1. Settings Saving Error: Adds missing payroll, rate, and geofencing columns.
--   2. Join Workspace Code Error: Adds a select policy allowing guest lookup of workspaces by code.
-- =========================================================================

-- 1. ADD MISSING WORKSPACE COLUMNS FOR SETTINGS AND PAYROLL
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS shift_start_time TEXT DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS expected_work_hours NUMERIC DEFAULT 8,
  ADD COLUMN IF NOT EXISTS late_grace_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_hourly_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_daily_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC DEFAULT 1.25,
  ADD COLUMN IF NOT EXISTS payroll_period TEXT DEFAULT 'semi-monthly',
  ADD COLUMN IF NOT EXISTS contact_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS break_hours NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS break_is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_threshold_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS custom_deductions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geofence_latitude NUMERIC(9,6) DEFAULT null,
  ADD COLUMN IF NOT EXISTS geofence_longitude NUMERIC(9,6) DEFAULT null,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER NOT NULL DEFAULT 100;

-- 2. ADD MISSING PROFILES COLUMNS FOR RATES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0;

-- 3. ADD MISSING ATTENDANCE COLUMNS FOR GEOFENCING AND OVERTIME
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6) DEFAULT null,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6) DEFAULT null,
  ADD COLUMN IF NOT EXISTS overtime_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overtime_approved BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overtime_approved_hours NUMERIC DEFAULT NULL;

-- 4. FIX FOR WORKSPACE LOOKUP (RLS Policy): Allow guests (unauthenticated) to find workspaces by code
DROP POLICY IF EXISTS "Allow public select of workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Allow anyone to find workspaces by code" ON public.workspaces;
CREATE POLICY "Allow anyone to find workspaces by code" ON public.workspaces
  FOR SELECT TO authenticated, anon
  USING (true);

-- Ensure permissions are granted to anon/authenticated roles
GRANT ALL ON public.profiles TO authenticated, anon;
GRANT ALL ON public.workspaces TO authenticated, anon;
GRANT ALL ON public.workspace_members TO authenticated, anon;
