-- Trackly V3 MVP upgrade columns for Jibble-inspired attendance, settings, and payroll.
-- Run this in Supabase SQL Editor before saving the new Workspace Rules form.

alter table public.workspaces
  add column if not exists shift_start_time text default '08:00',
  add column if not exists expected_work_hours numeric default 8,
  add column if not exists late_grace_minutes integer default 0,
  add column if not exists default_hourly_rate numeric default 0,
  add column if not exists default_daily_rate numeric default 0,
  add column if not exists overtime_rate numeric default 1.25,
  add column if not exists payroll_period text default 'semi-monthly',
  add column if not exists contact_number text default '';

alter table public.profiles
  add column if not exists hourly_rate numeric default 0,
  add column if not exists daily_rate numeric default 0;

create table if not exists public.attendance_correction_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null,
  request_type text not null,
  current_value text default '',
  requested_value text not null,
  reason text not null,
  status text not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists correction_requests_workspace_idx
  on public.attendance_correction_requests(workspace_id, created_at desc);

create index if not exists correction_requests_user_idx
  on public.attendance_correction_requests(user_id, created_at desc);
