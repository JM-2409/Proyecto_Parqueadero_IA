const ref = 'rjazltihisvxosyzohuy';
const token = 'sbp_2a3365320806f496cafb233002ec3dd75766e6b2';

const sql = `
-- Enable RLS on settings if not already enabled
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for parking_lots
DROP POLICY IF EXISTS "Enable all for authenticated users" ON parking_lots;
CREATE POLICY "Enable all for authenticated users" ON parking_lots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for settings
DROP POLICY IF EXISTS "Enable all for authenticated users" ON settings;
CREATE POLICY "Enable all for authenticated users" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
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
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
