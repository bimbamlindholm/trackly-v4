-- Trackly V3 Hardening & Security Consolidation Migration.
-- Run this in your Supabase SQL Editor.

-- 1. Create Audit Logs Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, -- acting admin user
  action text not null, -- 'payroll_approved', 'payroll_released', 'correction_approved', 'correction_rejected'
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_workspace_idx on public.audit_logs(workspace_id, created_at desc);

-- Enable RLS for Audit Logs
alter table public.audit_logs enable row level security;

-- 2. Drop existing helper functions first to avoid parameter conflict
drop function if exists public.share_workspace(uuid, uuid) cascade;
drop function if exists public.is_workspace_member(uuid, uuid) cascade;
drop function if exists public.is_workspace_admin(uuid, uuid) cascade;

-- 3. Create Helper Functions (SECURITY DEFINER to prevent infinite recursion loop)
create or replace function public.share_workspace(user_a uuid, user_b uuid)
returns boolean as $$
  select exists (
    select 1 from public.workspace_members wm1
    join public.workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
    where wm1.user_id = user_a and wm2.user_id = user_b
  );
$$ language sql security definer;

create or replace function public.is_workspace_member(ws_id uuid, u_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = u_id
  );
$$ language sql security definer;

create or replace function public.is_workspace_admin(ws_id uuid, u_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = u_id and role = 'admin'
  );
$$ language sql security definer;


-- 4. Immutability Trigger Functions for Payroll Locking

-- Prevent modifications to payroll batches once status = 'released'
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

-- Prevent insertions, updates, or deletions of payslips inside a released batch
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

-- Prevent attendance mutations (inserts, updates, deletes) on dates inside released payroll cutoffs
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

-- Prevent approval or rejection of DTR correction requests on dates inside released payroll cutoffs
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


-- 5. Harden Row Level Security (RLS) Policies Across All Tables

-- WORKSPACES
alter table public.workspaces enable row level security;
drop policy if exists "Users can view workspaces they are member of" on public.workspaces;
drop policy if exists "Admins can update their own workspaces" on public.workspaces;

create policy "Users can view workspaces they are member of" on public.workspaces
  for select to authenticated
  using (
    public.is_workspace_member(id, auth.uid())
  );

create policy "Admins can update their own workspaces" on public.workspaces
  for update to authenticated
  using (
    public.is_workspace_admin(id, auth.uid())
  );

-- WORKSPACE MEMBERS
alter table public.workspace_members enable row level security;
drop policy if exists "Users can view memberships in same workspace" on public.workspace_members;
drop policy if exists "Admins can manage memberships in workspace" on public.workspace_members;

create policy "Users can view memberships in same workspace" on public.workspace_members
  for select to authenticated
  using (
    public.is_workspace_member(workspace_id, auth.uid())
  );

create policy "Admins can manage memberships in workspace" on public.workspace_members
  for all to authenticated
  using (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- PROFILES
alter table public.profiles enable row level security;
drop policy if exists "Allow view profile if shared workspace or self" on public.profiles;
drop policy if exists "Allow update own profile" on public.profiles;

create policy "Allow view profile if shared workspace or self" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.share_workspace(auth.uid(), id));

create policy "Allow update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- ATTENDANCE RECORDS
alter table public.attendance_records enable row level security;
drop policy if exists "Employees can view and create own attendance" on public.attendance_records;
drop policy if exists "Admins can manage all attendance" on public.attendance_records;

create policy "Employees can view and create own attendance" on public.attendance_records
  for all to authenticated
  using (
    user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid())
  );

create policy "Admins can manage all attendance" on public.attendance_records
  for all to authenticated
  using (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- ATTENDANCE CORRECTION REQUESTS
alter table public.attendance_correction_requests enable row level security;
drop policy if exists "Employees can manage own correction requests" on public.attendance_correction_requests;
drop policy if exists "Admins can manage all correction requests" on public.attendance_correction_requests;

create policy "Employees can manage own correction requests" on public.attendance_correction_requests
  for all to authenticated
  using (
    user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid())
  );

create policy "Admins can manage all correction requests" on public.attendance_correction_requests
  for all to authenticated
  using (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- LEAVE REQUESTS (Create table if it doesn't exist yet)
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_type text not null default 'vacation',
  start_date date not null,
  end_date date not null,
  reason text default '',
  status text not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.leave_requests enable row level security;
drop policy if exists "Employees can manage own leaves" on public.leave_requests;
drop policy if exists "Admins can manage all leaves" on public.leave_requests;

create policy "Employees can manage own leaves" on public.leave_requests
  for all to authenticated
  using (
    user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid())
  );

create policy "Admins can manage all leaves" on public.leave_requests
  for all to authenticated
  using (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- AUDIT LOGS
drop policy if exists "Admins can view audit logs" on public.audit_logs;
drop policy if exists "Users can insert audit logs" on public.audit_logs;

create policy "Admins can view audit logs" on public.audit_logs
  for select to authenticated
  using (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

create policy "Users can insert audit logs" on public.audit_logs
  for insert to authenticated
  with check (
    user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid())
  );

-- PAYROLL BATCHES
alter table public.payroll_batches enable row level security;
drop policy if exists "Admins can manage payroll batches" on public.payroll_batches;
drop policy if exists "Employees can view payroll batches in their workspace" on public.payroll_batches;

create policy "Admins can manage payroll batches" on public.payroll_batches
  for all to authenticated
  using (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

create policy "Employees can view payroll batches in their workspace" on public.payroll_batches
  for select to authenticated
  using (
    public.is_workspace_member(workspace_id, auth.uid())
  );

-- PAYSLIPS
alter table public.payslips enable row level security;
drop policy if exists "Admins can manage payslips in their workspace" on public.payslips;
drop policy if exists "Employees can view their own payslips" on public.payslips;

create policy "Admins can manage payslips in their workspace" on public.payslips
  for all to authenticated
  using (
    exists (
      select 1 from public.payroll_batches pb
      where pb.id = payslips.batch_id and public.is_workspace_admin(pb.workspace_id, auth.uid())
    )
  );

create policy "Employees can view their own payslips" on public.payslips
  for select to authenticated
  using (
    user_id = auth.uid()
  );
