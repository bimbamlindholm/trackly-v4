-- =========================================================================
-- TRACKLY V3 - DYNAMIC WORKSPACE HOLIDAYS MIGRATION
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- This creates the workspace_holidays table and configures proper RLS policies
-- =========================================================================

-- 1. CREATE CUSTOM HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS public.workspace_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date date NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('regular', 'special')),
  created_at timestamp with time zone DEFAULT now(),
  
  -- Prevent duplicate holidays on the same date for a single workspace
  CONSTRAINT unique_workspace_holiday_date UNIQUE (workspace_id, date)
);

-- Index for speedy queries by workspace
CREATE INDEX IF NOT EXISTS idx_workspace_holidays_workspace_date 
ON public.workspace_holidays(workspace_id, date);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.workspace_holidays ENABLE ROW LEVEL SECURITY;

-- 3. SELECT POLICY: Allow any authenticated user in the workspace to view holidays
DROP POLICY IF EXISTS "Allow members to view workspace holidays" ON public.workspace_holidays;
CREATE POLICY "Allow members to view workspace holidays" ON public.workspace_holidays
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_holidays.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- 4. ALL OPERATIONS POLICY (Insert/Update/Delete) for Workspace Admins
DROP POLICY IF EXISTS "Allow workspace admins to manage holidays" ON public.workspace_holidays;
CREATE POLICY "Allow workspace admins to manage holidays" ON public.workspace_holidays
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_holidays.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_holidays.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'admin'
    )
  );

-- 5. GRANT PERMISSIONS FOR COMPATIBILITY
GRANT ALL ON public.workspace_holidays TO authenticated, anon;
