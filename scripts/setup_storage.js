const ref = 'rjazltihisvxosyzohuy';
const token = 'sbp_2a3365320806f496cafb233002ec3dd75766e6b2';

const sql = `
-- Create logos bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for logos bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "All Access for authenticated" ON storage.objects FOR ALL USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
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
