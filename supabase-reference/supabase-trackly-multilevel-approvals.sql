-- TRACKLY V3 - OPTION E: MULTI-LEVEL APPROVALS & TEAMS MIGRATION
-- This script adds the supervisor relationship and expands permissions for middle-management roles.

-- 1. Add supervisor_id to workspace_members if it doesn't exist
ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add performance indexes for supervisor relations and roles
CREATE INDEX IF NOT EXISTS idx_workspace_members_supervisor_id 
ON public.workspace_members(supervisor_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_role 
ON public.workspace_members(workspace_id, role);

-- 3. Enable middle-management permissions on approvals tables
-- LEAVE REQUESTS POLICIES FOR SUPERVISORS/MANAGERS
DROP POLICY IF EXISTS "Managers can view subordinate leaves" ON public.leave_requests;
CREATE POLICY "Managers can view subordinate leaves" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = leave_requests.workspace_id
        AND workspace_members.user_id = leave_requests.user_id
        AND workspace_members.supervisor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can update subordinate leaves" ON public.leave_requests;
CREATE POLICY "Managers can update subordinate leaves" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = leave_requests.workspace_id
        AND workspace_members.user_id = leave_requests.user_id
        AND workspace_members.supervisor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = leave_requests.workspace_id
        AND workspace_members.user_id = leave_requests.user_id
        AND workspace_members.supervisor_id = auth.uid()
    )
  );

-- ATTENDANCE CORRECTION REQUESTS POLICIES FOR SUPERVISORS/MANAGERS
DROP POLICY IF EXISTS "Managers can view subordinate corrections" ON public.attendance_correction_requests;
CREATE POLICY "Managers can view subordinate corrections" ON public.attendance_correction_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = attendance_correction_requests.workspace_id
        AND workspace_members.user_id = attendance_correction_requests.user_id
        AND workspace_members.supervisor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can update subordinate corrections" ON public.attendance_correction_requests;
CREATE POLICY "Managers can update subordinate corrections" ON public.attendance_correction_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = attendance_correction_requests.workspace_id
        AND workspace_members.user_id = attendance_correction_requests.user_id
        AND workspace_members.supervisor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = attendance_correction_requests.workspace_id
        AND workspace_members.user_id = attendance_correction_requests.user_id
        AND workspace_members.supervisor_id = auth.uid()
    )
  );
