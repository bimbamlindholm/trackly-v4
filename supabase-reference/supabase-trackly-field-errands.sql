-- =========================================================================
-- TRACKLY V3 - FIELD ERRANDS & OUT-OF-STORE ERAND LOGS SCHEMA
-- =========================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- This enables real-time location tracking and photo-upload verification 
-- for off-site tasks (e.g., bank deposits, client visits, logistics runs).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.field_errands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    errand_type TEXT NOT NULL, -- e.g. 'Bank Deposit', 'Logistics Run', 'Client Visit', 'Others'
    purpose TEXT,
    status TEXT NOT NULL DEFAULT 'started', -- 'started', 'arrived', 'completed', 'cancelled'
    
    -- Errand Start Coordinates & Timing
    start_time TIMESTAMPTZ DEFAULT now(),
    start_latitude NUMERIC(9,6),
    start_longitude NUMERIC(9,6),
    
    -- Arrival/Checkpoint Coordinates, Timing & Image Verification
    arrival_time TIMESTAMPTZ,
    arrival_latitude NUMERIC(9,6),
    arrival_longitude NUMERIC(9,6),
    arrival_photo TEXT, -- Storage URL/cam snapshot of deposit slip or receipt
    
    -- End/Finish Coordinates & Timing
    end_time TIMESTAMPTZ,
    end_latitude NUMERIC(9,6),
    end_longitude NUMERIC(9,6),
    
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.field_errands ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow users to select their own errands" ON public.field_errands;
DROP POLICY IF EXISTS "Allow admins of workspace to select all errands" ON public.field_errands;
DROP POLICY IF EXISTS "Allow users to insert their own errands" ON public.field_errands;
DROP POLICY IF EXISTS "Allow users to update their own errands" ON public.field_errands;

-- RLS Policies
CREATE POLICY "Allow users to select their own errands" ON public.field_errands
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Allow admins of workspace to select all errands" ON public.field_errands
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = field_errands.workspace_id
              AND workspace_members.user_id = auth.uid()
              AND workspace_members.role = 'admin'
        )
    );

CREATE POLICY "Allow users to insert their own errands" ON public.field_errands
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own errands" ON public.field_errands
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Enable Storage buckets for errand attachments (deposit slips / receipts)
-- Add policies to allow authenticated users to upload and view photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('errand-receipts', 'errand-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for uploads
DROP POLICY IF EXISTS "Allow authenticated upload to errand-receipts" ON storage.objects;
CREATE POLICY "Allow authenticated upload to errand-receipts" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'errand-receipts');

DROP POLICY IF EXISTS "Allow public view of errand-receipts" ON storage.objects;
CREATE POLICY "Allow public view of errand-receipts" ON storage.objects
    FOR SELECT TO authenticated, anon
    USING (bucket_id = 'errand-receipts');
