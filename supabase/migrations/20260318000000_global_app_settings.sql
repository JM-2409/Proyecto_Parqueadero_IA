CREATE TABLE IF NOT EXISTS global_app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT DEFAULT 'NexoPark',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO global_app_settings (app_name)
SELECT 'NexoPark'
WHERE NOT EXISTS (SELECT 1 FROM global_app_settings);

ALTER TABLE global_app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global app settings"
  ON global_app_settings FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can update global app settings"
  ON global_app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'superadmin'
    )
  );
