-- Trackly V3 Geofencing & GPS Radius Lock SQL Migration
-- Run this in your Supabase SQL Editor to enable geofencing options in your workspace.

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geofence_latitude NUMERIC(9,6) DEFAULT null,
  ADD COLUMN IF NOT EXISTS geofence_longitude NUMERIC(9,6) DEFAULT null,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER NOT NULL DEFAULT 100;

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6) DEFAULT null,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6) DEFAULT null;
