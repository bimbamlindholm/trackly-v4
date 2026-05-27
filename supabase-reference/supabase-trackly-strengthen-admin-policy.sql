-- Trackly V3 - Strengthen Workspace Admin RLS Policy
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- This makes sure that the workspace owner ALWAYS has full admin permissions for their own workspace,
-- even if their workspace membership record is missing, corrupted, or has a different role.

-- 1. STRENGTHEN IS_WORKSPACE_ADMIN FUNCTION
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id AND owner_id = u_id
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. STRENGTHEN IS_WORKSPACE_MEMBER FUNCTION (owner is also always a member)
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id AND owner_id = u_id
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ENSURE RLS UPDATE POLICY EXISTS FOR WORKSPACES
DROP POLICY IF EXISTS "Admins can update their own workspaces" ON public.workspaces;
CREATE POLICY "Admins can update their own workspaces" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_admin(id, auth.uid())
  );
