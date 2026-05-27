-- =========================================================================
-- TRACKLY V3 - CRITICAL SECURITY & ACCESS CONTROL PATCH (UPDATED)
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- This creates the supervisor_id column, sets indexes, fixes registration,
-- and allows supervisors to view subordinate DTR attendance grids.
-- =========================================================================

-- 1. ENSURE SUPERVISOR_ID COLUMN AND INDEXES EXIST
-- This prevents the "column workspace_members.supervisor_id does not exist" error
ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_members_supervisor_id 
ON public.workspace_members(supervisor_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_role 
ON public.workspace_members(workspace_id, role);

-- 2. REPAIR PROFILES INSERT POLICY
-- Ensure new users can insert their own profiles during sign-up
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 3. REPAIR WORKSPACE MEMBERS INSERT & UPDATE POLICIES
-- This allows employees to register and join a workspace, and updates their connection
DROP POLICY IF EXISTS "Allow users to insert their own memberships" ON public.workspace_members;
CREATE POLICY "Allow users to insert their own memberships" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Employees can join a workspace as 'employee' using their own user ID
    (role = 'employee' AND user_id = auth.uid())
    OR
    -- Admins can connect to their own workspace as 'admin' if they own the workspace
    (role = 'admin' AND user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Allow users to update their own memberships" ON public.workspace_members;
CREATE POLICY "Allow users to update their own memberships" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. REPAIR ATTENDANCE RECORDS FOR SUPERVISORS/MANAGERS
-- This allows supervisors to view the DTR status matrix of their assigned subordinates
DROP POLICY IF EXISTS "Supervisors can view subordinate attendance" ON public.attendance_records;
CREATE POLICY "Supervisors can view subordinate attendance" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = attendance_records.workspace_id
        AND workspace_members.user_id = attendance_records.user_id
        AND workspace_members.supervisor_id = auth.uid()
    )
  );

-- 5. DOUBLE CHECK SUPERVISOR VIEW ON PROFILES
-- Ensure supervisors can view subordinates' profile names and department details
DROP POLICY IF EXISTS "Supervisors can view subordinate profiles" ON public.profiles;
CREATE POLICY "Supervisors can view subordinate profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.user_id = profiles.id
        AND workspace_members.supervisor_id = auth.uid()
    )
  );

-- 6. BROADEN PERMISSIONS FOR ROBUST COMPATIBILITY
GRANT ALL ON public.profiles TO authenticated, anon;
GRANT ALL ON public.workspaces TO authenticated, anon;
GRANT ALL ON public.workspace_members TO authenticated, anon;
GRANT ALL ON public.attendance_records TO authenticated, anon;
GRANT ALL ON public.leave_requests TO authenticated, anon;
GRANT ALL ON public.attendance_correction_requests TO authenticated, anon;
