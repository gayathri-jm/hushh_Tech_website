-- Add onboarding-specific columns to kirkland_agents
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

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_kirkland_agents_status ON kirkland_agents(status);
CREATE INDEX IF NOT EXISTS idx_kirkland_agents_email ON kirkland_agents(email);

-- Allow anon users to insert (for onboarding form)
CREATE POLICY "Anon users can insert kirkland agents for onboarding"
  ON kirkland_agents FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role can update (for activation)
CREATE POLICY "Service role can update kirkland agents"
  ON kirkland_agents FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
