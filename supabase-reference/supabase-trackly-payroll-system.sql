-- Trackly V3 Database Persistence for Payroll Cutoffs & Payslips.
-- Run this in your Supabase SQL Editor to support permanent payroll approvals and locking.

-- 1. Table for Payroll Cutoff Batches
create table if not exists public.payroll_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending', -- pending, approved, released
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  released_at timestamptz,
  constraint unique_cutoff unique (workspace_id, start_date, end_date)
);

-- 2. Table for Individual Employee Payslips within a Batch
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
  gross_pay numeric not null default 0,
  late_deduction numeric not null default 0,
  undertime_deduction numeric not null default 0,
  total_deductions numeric not null default 0,
  net_pay numeric not null default 0,
  payslip_pdf_url text default '',
  created_at timestamptz not null default now()
);

-- 3. Indexing for Fast Cutoff Queries & Referencing
create index if not exists payroll_batches_workspace_status_idx 
  on public.payroll_batches(workspace_id, status);

create index if not exists payslips_batch_user_idx 
  on public.payslips(batch_id, user_id);

-- 4. Enable Row Level Security (RLS)
alter table public.payroll_batches enable row level security;
alter table public.payslips enable row level security;

-- 5. RLS Policies for Payroll Batches
-- Drop policies if they exist to avoid duplicate errors
drop policy if exists "Admins can do everything on payroll_batches" on public.payroll_batches;
drop policy if exists "Employees can view payroll_batches in their workspace" on public.payroll_batches;

-- Admins have full control over payroll batches
create policy "Admins can do everything on payroll_batches"
  on public.payroll_batches for all
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = payroll_batches.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- Workspace members (including regular employees) can select/view batches
create policy "Employees can view payroll_batches in their workspace"
  on public.payroll_batches for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = payroll_batches.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- 6. RLS Policies for Payslips
-- Drop policies if they exist to avoid duplicate errors
drop policy if exists "Admins can manage all payslips" on public.payslips;
drop policy if exists "Employees can view their own payslips" on public.payslips;

-- Admins can manage all payslips in their workspace.
-- Employees can view their own payslips (critical for employee payslip access feature!).
create policy "Admins can manage all payslips"
  on public.payslips for all
  to authenticated
  using (
    exists (
      select 1 from public.payroll_batches pb
      join public.workspace_members wm on wm.workspace_id = pb.workspace_id
      where pb.id = payslips.batch_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

create policy "Employees can view their own payslips"
  on public.payslips for select
  to authenticated
  using (
    user_id = auth.uid()
  );

-- Migration for Night Differential pay
alter table public.payslips add column if not exists night_diff_pay numeric not null default 0;

-- Migration for Dynamic Custom Deductions
alter table public.payslips add column if not exists custom_deductions jsonb not null default '[]'::jsonb;


