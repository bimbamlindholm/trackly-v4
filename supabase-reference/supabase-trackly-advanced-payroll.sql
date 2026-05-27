-- Add advanced payroll columns to public.workspaces
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS break_hours numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS break_is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_threshold_minutes integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS custom_deductions jsonb DEFAULT '[]'::jsonb;

-- Add overtime reasoning and approval columns to public.attendance_records
ALTER TABLE public.attendance_records 
  ADD COLUMN IF NOT EXISTS overtime_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overtime_approved boolean DEFAULT NULL, -- NULL = Pending, TRUE = Approved, FALSE = Denied
  ADD COLUMN IF NOT EXISTS overtime_approved_hours numeric DEFAULT NULL;

-- Enable real-time replication or sync for workspaces and attendance_records if applicable
-- (Usually managed by Supabase console, but good to run)
COMMENT ON COLUMN public.workspaces.break_hours IS 'Configurable break time duration in hours per day';
COMMENT ON COLUMN public.workspaces.break_is_paid IS 'Indicates if the break time is counted as paid working hours';
COMMENT ON COLUMN public.workspaces.overtime_threshold_minutes IS 'Minimum working minutes beyond expected hours before counting as overtime';
COMMENT ON COLUMN public.workspaces.custom_deductions IS 'Array of custom deductions: [{"id": "uuid", "name": "PhilHealth", "type": "percentage", "value": 4.0}]';
COMMENT ON COLUMN public.attendance_records.overtime_reason IS 'Employee-submitted reasoning for working overtime';
COMMENT ON COLUMN public.attendance_records.overtime_approved IS 'Admin approval state for the recorded overtime';
COMMENT ON COLUMN public.attendance_records.overtime_approved_hours IS 'Amount of overtime hours approved by the admin';
