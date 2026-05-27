-- Trackly V3 - Row Level Security (RLS) Permission Fix Patch
-- Run this script in your Supabase SQL Editor (https://supabase.com) to allow Admins and Employees to register and connect properly.

-- =========================================================================
-- 1. FIX FOR PROFILES: Allow users to insert their own profile details
-- =========================================================================
drop policy if exists "Allow users to insert their own profile" on public.profiles;
create policy "Allow users to insert their own profile" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- =========================================================================
-- 2. FIX FOR WORKSPACES: Allow registered admins to create workspaces
-- =========================================================================
drop policy if exists "Allow users to insert workspaces" on public.workspaces;
create policy "Allow users to insert workspaces" on public.workspaces
  for insert to authenticated
  with check (owner_id = auth.uid());

-- =========================================================================
-- 3. FIX FOR WORKSPACE MEMBERS: Allow members to insert/connect their accounts
-- =========================================================================
drop policy if exists "Allow users to insert their own memberships" on public.workspace_members;
create policy "Allow users to insert their own memberships" on public.workspace_members
  for insert to authenticated
  with check (
    -- Case A: Employees can connect to a workspace as 'employee' using their own user ID
    (role = 'employee' and user_id = auth.uid())
    or
    -- Case B: Admins can connect to their own workspace as 'admin' if they own the workspace
    (role = 'admin' and user_id = auth.uid() and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    ))
  );

-- =========================================================================
-- 4. VERIFY: Ensure the status of the connection is accessible to the system
-- =========================================================================
-- Grant permissions on these tables to ensure no API restrictions occur
grant all on public.profiles to authenticated, anon;
grant all on public.workspaces to authenticated, anon;
grant all on public.workspace_members to authenticated, anon;
