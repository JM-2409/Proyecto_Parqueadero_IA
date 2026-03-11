const ref = 'rjazltihisvxosyzohuy';
const token = 'sbp_2a3365320806f496cafb233002ec3dd75766e6b2';

const sql = `
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key;
ALTER TABLE settings ADD CONSTRAINT settings_key_parking_lot_id_key UNIQUE (key, parking_lot_id);
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
