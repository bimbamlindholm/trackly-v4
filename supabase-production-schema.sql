-- =========================================================================
-- TRACKLY PRODUCTION DATABASE INITIALIZATION & HARDENING SCHEMA
-- =========================================================================
-- Run this full script in your Supabase SQL Editor (https://supabase.com).
-- This script creates the core database models, defines robust RLS policies,
-- configures storage buckets, indexes tables for high performance, and sets
-- up PostgreSQL triggers to enforce financial and operational immutability.
-- =========================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. CORE DATA TABLES
-- ==========================================

-- Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'personal' check (role in ('admin', 'employee', 'personal')),
  position text default '',
  department text default '',
  phone text default '',
  address text default '',
  employee_id text default '',
  face_photo text default '',
  hourly_rate numeric not null default 0,
  daily_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workspaces Table
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_name text not null,
  workspace_code text not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  industry text default 'General',
  team_size text default '1-10',
  company_address text default '',
  contact_number text default '',
  salary_model text not null default 'hourly' check (salary_model in ('hourly', 'daily')),
  default_hourly_rate numeric not null default 75,
  default_daily_rate numeric not null default 600,
  expected_work_hours numeric not null default 8,
  payroll_period text not null default 'semi-monthly',
  late_grace_minutes integer not null default 10,
  overtime_rate numeric not null default 1.25,
  break_hours numeric not null default 1.0,
  break_is_paid boolean not null default false,
  overtime_threshold_minutes integer not null default 30,
  custom_deductions jsonb not null default '[]'::jsonb,
  geofence_enabled boolean not null default false,
  geofence_latitude numeric(9,6) default null,
  geofence_longitude numeric(9,6) default null,
  geofence_radius_meters integer not null default 100,
  camera_attendance_enabled boolean not null default true,
  face_matching_enabled boolean not null default false,
  require_admin_payslip_release boolean not null default true,
  subscription_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workspace Members Table
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'employee' check (role in ('admin', 'employee', 'manager', 'supervisor')),
  status text not null default 'active' check (status in ('active', 'pending', 'suspended', 'disconnected')),
  supervisor_id uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_workspace_membership unique (workspace_id, user_id)
);

-- Employee Permissions Table
create table if not exists public.employee_permissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  can_clock_in_out boolean not null default true,
  can_request_leaves boolean not null default true,
  can_request_corrections boolean not null default true,
  can_view_payroll boolean not null default true,
  can_view_schedules boolean not null default true,
  can_run_payroll boolean not null default false,
  can_manage_schedules boolean not null default false,
  can_manage_employees boolean not null default false,
  can_manage_settings boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Attendance Records Table
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('time_in', 'break_in', 'break_out', 'time_out')),
  status text not null default 'Working',
  timestamp timestamptz not null default now(),
  date date not null,
  latitude numeric(9,6) default null,
  longitude numeric(9,6) default null,
  verification_photo text default '',
  comment text default '',
  overtime_reason text default null,
  overtime_approved boolean default null,
  overtime_approved_hours numeric default null,
  created_at timestamptz not null default now()
);

-- Schedules Table
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  shift_start text not null, -- Format: 'HH:MM' (24-hour format) or 'OFF'
  shift_end text not null,   -- Format: 'HH:MM' (24-hour format) or 'OFF'
  label text not null default 'Day Shift',
  color text not null default '#06b6d4',
  notes text default null,
  created_at timestamptz not null default now(),
  constraint unique_user_date_schedule unique (user_id, date)
);

-- Custom Holidays Table
create table if not exists public.workspace_holidays (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  date date not null,
  name text not null,
  type text not null check (type in ('regular', 'special')),
  created_at timestamptz not null default now(),
  constraint unique_workspace_holiday_date unique (workspace_id, date)
);

-- Announcements Table
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  body text not null,
  admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Leave Requests Table
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_type text not null default 'vacation' check (leave_type in ('sick', 'vacation', 'emergency', 'others')),
  start_date date not null,
  end_date date not null,
  reason text default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Attendance Correction Requests Table
create table if not exists public.attendance_correction_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null,
  request_type text not null, -- e.g. 'time_in', 'time_out', 'break'
  current_value text default '',
  requested_value text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Field Errands Table
create table if not exists public.field_errands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  errand_type text not null, -- 'Bank Deposit', 'Logistics Run', 'Client Visit', 'Others'
  purpose text,
  status text not null default 'started' check (status in ('started', 'arrived', 'completed', 'cancelled')),
  start_time timestamptz default now(),
  start_latitude numeric(9,6),
  start_longitude numeric(9,6),
  arrival_time timestamptz,
  arrival_latitude numeric(9,6),
  arrival_longitude numeric(9,6),
  arrival_photo text,
  end_time timestamptz,
  end_latitude numeric(9,6),
  end_longitude numeric(9,6),
  duration_minutes integer,
  notes text,
  created_at timestamptz default now()
);

-- ==========================================
-- 2. PAYROLL & WORKPLACE LOCKING TABLES
-- ==========================================

-- Payroll Batches Table
create table if not exists public.payroll_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'released')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  released_at timestamptz,
  constraint unique_cutoff unique (workspace_id, start_date, end_date)
);

-- Payslips Table
create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.payroll_batches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_days integer not null default 0,
  rows_count integer not null default 0,
  total_hours text not null,
  overtime_hours text not null,
  late_minutes integer not null default 0,
  undertime_hours text not null,
  regular_pay numeric not null default 0,
  overtime_pay numeric not null default 0,
  holiday_pay numeric not null default 0,
  night_diff_pay numeric not null default 0,
  gross_pay numeric not null default 0,
  late_deduction numeric not null default 0,
  undertime_deduction numeric not null default 0,
  custom_deductions jsonb not null default '[]'::jsonb,
  total_deductions numeric not null default 0,
  net_pay numeric not null default 0,
  payslip_pdf_url text default '',
  created_at timestamptz not null default now()
);

-- Audit Logs Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null, -- 'payroll_approved', 'payroll_released', 'workspace_connected', 'workspace_disconnected'
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ==========================================
-- 3. SPEED INDEXING FOR HIGH LOAD
-- ==========================================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_attendance_records_workspace_date on public.attendance_records(workspace_id, date);
create index if not exists idx_attendance_records_user_date on public.attendance_records(user_id, date);
create index if not exists idx_schedules_workspace_date on public.schedules(workspace_id, date);
create index if not exists idx_schedules_user_date on public.schedules(user_id, date);
create index if not exists idx_payroll_batches_workspace_status on public.payroll_batches(workspace_id, status);
create index if not exists idx_payslips_batch_user on public.payslips(batch_id, user_id);
create index if not exists idx_leave_requests_workspace_status on public.leave_requests(workspace_id, status);
create index if not exists idx_correction_requests_workspace_status on public.attendance_correction_requests(workspace_id, status);
create index if not exists idx_audit_logs_workspace_created on public.audit_logs(workspace_id, created_at desc);

-- ==========================================
-- 4. SECURITY & HELPER FUNCTIONS
-- ==========================================

-- Helper: Check if two users share a workspace
create or replace function public.share_workspace(user_a uuid, user_b uuid)
returns boolean as $$
  select exists (
    select 1 from public.workspace_members wm1
    join public.workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
    where wm1.user_id = user_a and wm2.user_id = user_b
  );
$$ language sql security definer;

-- Helper: Check if user is a workspace member
create or replace function public.is_workspace_member(ws_id uuid, u_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = u_id and status = 'active'
  );
$$ language sql security definer;

-- Helper: Check if user is a workspace administrator
create or replace function public.is_workspace_admin(ws_id uuid, u_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = u_id and role = 'admin' and status = 'active'
  );
$$ language sql security definer;

-- ==========================================
-- 5. IMMUTABILITY TRIGGER PL/PGSQL FUNCTIONS
-- ==========================================

-- Trigger Function: Prevent payroll batch mutations after status is 'released'
create or replace function public.enforce_payroll_batch_immutability()
returns trigger as $$
begin
  if (tg_op = 'UPDATE' or tg_op = 'DELETE') and old.status = 'released' then
    raise exception 'This payroll batch is released and locked. Deletions or updates are strictly blocked.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_enforce_payroll_batch_immutability on public.payroll_batches;
create trigger trigger_enforce_payroll_batch_immutability
  before update or delete on public.payroll_batches
  for each row execute function public.enforce_payroll_batch_immutability();


-- Trigger Function: Prevent payslip operations inside a released batch
create or replace function public.enforce_payslip_immutability()
returns trigger as $$
declare
  target_batch_id uuid;
begin
  target_batch_id := case when tg_op = 'DELETE' then old.batch_id else new.batch_id end;

  if exists (
    select 1 from public.payroll_batches
    where id = target_batch_id and status = 'released'
  ) then
    raise exception 'Payslips associated with a released/locked payroll batch cannot be created, modified, or deleted.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_enforce_payslip_immutability on public.payslips;
create trigger trigger_enforce_payslip_immutability
  before insert or update or delete on public.payslips
  for each row execute function public.enforce_payslip_immutability();


-- Trigger Function: Lock attendance modifications for locked/released cutoff periods
create or replace function public.enforce_attendance_payroll_lock()
returns trigger as $$
declare
  target_workspace_id uuid;
  target_date date;
begin
  target_workspace_id := case when tg_op = 'DELETE' then old.workspace_id else new.workspace_id end;
  target_date := case when tg_op = 'DELETE' then old.date::date else new.date::date end;

  if exists (
    select 1 from public.payroll_batches
    where workspace_id = target_workspace_id
      and status = 'released'
      and target_date between start_date and end_date
  ) then
    raise exception 'Attendance record is locked: this date falls within a released payroll cutoff period.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_enforce_attendance_payroll_lock on public.attendance_records;
create trigger trigger_enforce_attendance_payroll_lock
  before insert or update or delete on public.attendance_records
  for each row execute function public.enforce_attendance_payroll_lock();


-- Trigger Function: Lock correction requests for locked/released cutoff periods
create or replace function public.enforce_corrections_payroll_lock()
returns trigger as $$
declare
  target_workspace_id uuid;
  target_date date;
begin
  target_workspace_id := case when tg_op = 'DELETE' then old.workspace_id else new.workspace_id end;
  target_date := case when tg_op = 'DELETE' then old.attendance_date::date else new.attendance_date::date end;

  if exists (
    select 1 from public.payroll_batches
    where workspace_id = target_workspace_id
      and status = 'released'
      and target_date between start_date and end_date
  ) then
    raise exception 'DTR correction request is locked: this date falls within a released payroll cutoff period.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_enforce_corrections_payroll_lock on public.attendance_correction_requests;
create trigger trigger_enforce_corrections_payroll_lock
  before insert or update or delete on public.attendance_correction_requests
  for each row execute function public.enforce_corrections_payroll_lock();


-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.employee_permissions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.schedules enable row level security;
alter table public.workspace_holidays enable row level security;
alter table public.announcements enable row level security;
alter table public.leave_requests enable row level security;
alter table public.attendance_correction_requests enable row level security;
alter table public.field_errands enable row level security;
alter table public.payroll_batches enable row level security;
alter table public.payslips enable row level security;
alter table public.audit_logs enable row level security;

-- Drop all standard security policies for fresh deploy
drop policy if exists "allow_profile_select" on public.profiles;
drop policy if exists "allow_profile_update" on public.profiles;
drop policy if exists "allow_workspace_select" on public.workspaces;
drop policy if exists "allow_workspace_insert" on public.workspaces;
drop policy if exists "allow_workspace_update" on public.workspaces;
drop policy if exists "allow_members_select" on public.workspace_members;
drop policy if exists "allow_members_all_for_admins" on public.workspace_members;
drop policy if exists "allow_members_insert_for_invite" on public.workspace_members;
drop policy if exists "allow_attendance_all_for_employees" on public.attendance_records;
drop policy if exists "allow_attendance_all_for_admins" on public.attendance_records;
drop policy if exists "allow_schedules_select" on public.schedules;
drop policy if exists "allow_schedules_all_for_admins" on public.schedules;

-- RLS: PROFILES
create policy "allow_profile_select" on public.profiles 
  for select to authenticated using (id = auth.uid() or public.share_workspace(auth.uid(), id));

create policy "allow_profile_update" on public.profiles 
  for update to authenticated using (id = auth.uid());

-- RLS: WORKSPACES
-- Let guests select workspaces to validate workspace code during sign-up/connect flow
create policy "allow_workspace_select" on public.workspaces 
  for select to authenticated, anon using (true);

create policy "allow_workspace_insert" on public.workspaces 
  for insert to authenticated with check (owner_id = auth.uid());

create policy "allow_workspace_update" on public.workspaces 
  for update to authenticated using (public.is_workspace_admin(id, auth.uid()));

-- RLS: WORKSPACE MEMBERS
create policy "allow_members_select" on public.workspace_members 
  for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "allow_members_insert_for_invite" on public.workspace_members 
  for insert to authenticated, anon with check (true);

create policy "allow_members_all_for_admins" on public.workspace_members 
  for all to authenticated using (public.is_workspace_admin(workspace_id, auth.uid()));

-- RLS: ATTENDANCE RECORDS
create policy "allow_attendance_all_for_employees" on public.attendance_records 
  for all to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid()));

create policy "allow_attendance_all_for_admins" on public.attendance_records 
  for all to authenticated using (public.is_workspace_admin(workspace_id, auth.uid()));

-- RLS: SCHEDULES
create policy "allow_schedules_select" on public.schedules 
  for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "allow_schedules_all_for_admins" on public.schedules 
  for all to authenticated using (public.is_workspace_admin(workspace_id, auth.uid()));

-- RLS: LEAVE REQUESTS
create policy "allow_leaves_for_employees" on public.leave_requests
  for all to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid()));

create policy "allow_leaves_for_admins" on public.leave_requests
  for all to authenticated using (public.is_workspace_admin(workspace_id, auth.uid()));

-- RLS: CORRECTIONS
create policy "allow_corrections_for_employees" on public.attendance_correction_requests
  for all to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid()));

create policy "allow_corrections_for_admins" on public.attendance_correction_requests
  for all to authenticated using (public.is_workspace_admin(workspace_id, auth.uid()));

-- RLS: AUDIT LOGS
create policy "allow_audit_select_for_admins" on public.audit_logs
  for select to authenticated using (public.is_workspace_admin(workspace_id, auth.uid()));

create policy "allow_audit_insert_for_members" on public.audit_logs
  for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid()));

-- RLS: PAYROLL BATCHES
create policy "allow_batches_select" on public.payroll_batches
  for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "allow_batches_all_for_admins" on public.payroll_batches
  for all to authenticated using (public.is_workspace_admin(workspace_id, auth.uid()));

-- RLS: PAYSLIPS
create policy "allow_payslips_select_for_self" on public.payslips
  for select to authenticated using (user_id = auth.uid());

create policy "allow_payslips_all_for_admins" on public.payslips
  for all to authenticated using (
    exists (
      select 1 from public.payroll_batches pb
      where pb.id = payslips.batch_id and public.is_workspace_admin(pb.workspace_id, auth.uid())
    )
  );

-- ==========================================
-- 7. STORAGE BUCKETS & OBJECT POLICIES
-- ==========================================

-- Errand Receipts bucket
insert into storage.buckets (id, name, public) 
values ('errand-receipts', 'errand-receipts', true)
on conflict (id) do nothing;

create policy "allow_receipts_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'errand-receipts');

create policy "allow_receipts_select" on storage.objects
  for select to authenticated, anon using (bucket_id = 'errand-receipts');

-- Face Photo Verification bucket
insert into storage.buckets (id, name, public) 
values ('biometrics', 'biometrics', true)
on conflict (id) do nothing;

create policy "allow_biometrics_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'biometrics');

create policy "allow_biometrics_select" on storage.objects
  for select to authenticated, anon using (bucket_id = 'biometrics');

-- Grant all privileges to anon/authenticated roles
grant all on public.profiles to authenticated, anon;
grant all on public.workspaces to authenticated, anon;
grant all on public.workspace_members to authenticated, anon;
grant all on public.employee_permissions to authenticated, anon;
grant all on public.attendance_records to authenticated, anon;
grant all on public.schedules to authenticated, anon;
grant all on public.workspace_holidays to authenticated, anon;
grant all on public.announcements to authenticated, anon;
grant all on public.leave_requests to authenticated, anon;
grant all on public.attendance_correction_requests to authenticated, anon;
grant all on public.field_errands to authenticated, anon;
grant all on public.payroll_batches to authenticated, anon;
grant all on public.payslips to authenticated, anon;
grant all on public.audit_logs to authenticated, anon;
