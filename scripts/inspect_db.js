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
      -- Add logo_url and nit to parking_lots if they don't exist
      ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS nit TEXT;

      -- Create logos bucket
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('logos', 'logos', true)
      ON CONFLICT (id) DO NOTHING;
      
      -- Create policies for logos bucket
      CREATE POLICY "Allow public read access logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
      CREATE POLICY "Allow authenticated uploads logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
      CREATE POLICY "Allow authenticated updates logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos');
      CREATE POLICY "Allow authenticated deletes logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos');
    `);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
