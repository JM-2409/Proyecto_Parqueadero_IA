const https = require('https');

const PAT = 'sbp_2a3365320806f496cafb233002ec3dd75766e6b2';
const PROJECT_REF = 'rjazltihisvxosyzohuy';

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    const result = await runQuery(`
      CREATE TABLE IF NOT EXISTS vehicle_novelties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
        license_plate TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        observation TEXT NOT NULL,
        photo_url TEXT,
        guard_name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE vehicle_novelties ENABLE ROW LEVEL SECURITY;

      -- Create policies
      CREATE POLICY "Allow authenticated read access" ON vehicle_novelties FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Allow authenticated insert access" ON vehicle_novelties FOR INSERT TO authenticated WITH CHECK (true);

      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('novelties', 'novelties', true)
      ON CONFLICT (id) DO NOTHING;
      
      -- Drop existing policies if they exist to avoid errors
      DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

      CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (bucket_id = 'novelties');
      CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'novelties');
      CREATE POLICY "Allow authenticated updates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'novelties');
      CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'novelties');
    `);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
