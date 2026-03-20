const ref = 'rjazltihisvxosyzohuy';
const token = 'sbp_2a3365320806f496cafb233002ec3dd75766e6b2';

const sql = `
-- Drop existing policies to be sure
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "All Access for authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can insert logos" ON storage.objects;

-- Create policies that allow anyone to do anything in the logos bucket for now (debugging)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Anyone can insert logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Anyone can update logos" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'logos');
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
