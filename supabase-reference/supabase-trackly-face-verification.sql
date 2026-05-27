-- Trackly V3 Database Migration: AI Face Verification
-- Add columns to support reference face templates and check-in captured verification selfies.
-- Run this script in your Supabase SQL Editor.

-- 1. Add Require Face Verification toggle setting to employee permissions
ALTER TABLE public.employee_permissions
  ADD COLUMN IF NOT EXISTS face_verification BOOLEAN DEFAULT false;

-- 2. Add Face Photo (Base64 reference template) to employee profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS face_photo TEXT DEFAULT '';

-- 3. Add Verification Photo (Base64 check-in selfie) to attendance records
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS verification_photo TEXT DEFAULT '';
