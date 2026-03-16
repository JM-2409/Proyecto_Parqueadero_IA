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
  const sql = "DROP TABLE IF EXISTS money_counts; ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS rate_id UUID REFERENCES rates(id) ON DELETE SET NULL; ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS rate_name TEXT; CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session_per_plate ON parking_sessions (parking_lot_id, license_plate) WHERE status = 'active';";

  try {
    const result = await runQuery(sql);
    console.log('Migration successful:', result);
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

main();
