-- Trackly V3 - Subscription Management Table Schema Updates
-- This script adds subscription information tracking to profiles and workspaces tables.

ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';

ALTER TABLE IF EXISTS public.workspaces
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';

COMMENT ON COLUMN public.profiles.subscription_tier IS 'Pricing plan tier for personal trackings (free, pro)';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Status of personal subscription (active, trialing, past_due, canceled)';
COMMENT ON COLUMN public.workspaces.subscription_tier IS 'Pricing plan tier for workspace organizations (free, premium)';
COMMENT ON COLUMN public.workspaces.subscription_status IS 'Status of workspace organization subscription (active, trialing, past_due, canceled)';
