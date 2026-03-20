const ref = 'rjazltihisvxosyzohuy';
const token = 'sbp_2a3365320806f496cafb233002ec3dd75766e6b2';

const sql = `
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

DROP POLICY IF EXISTS "Anyone can read global app settings" ON global_app_settings;
CREATE POLICY "Anyone can read global app settings"
  ON global_app_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Superadmins can update global app settings" ON global_app_settings;
CREATE POLICY "Superadmins can update global app settings"
  ON global_app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'superadmin'
    )
  );
`;

fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
})
.then(res => res.json())
.then(data => console.log('Response:', JSON.stringify(data, null, 2)))
.catch(err => console.error('Error:', err));
