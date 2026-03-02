-- Run this in Supabase Dashboard SQL Editor
-- Adds onboarding columns to kirkland_agents table

ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT '{}';
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS years_in_business INTEGER;
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE kirkland_agents ADD COLUMN IF NOT EXISTS activation_token TEXT;

CREATE INDEX IF NOT EXISTS idx_kirkland_agents_status ON kirkland_agents(status);
CREATE INDEX IF NOT EXISTS idx_kirkland_agents_email ON kirkland_agents(email);
