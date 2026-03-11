const ref = 'rjazltihisvxosyzohuy';
const token = 'sbp_2a3365320806f496cafb233002ec3dd75766e6b2';

const sql = `
DO $$
DECLARE
  default_lot_id UUID;
BEGIN
  -- Check if a default lot exists, if not create one
  SELECT id INTO default_lot_id FROM parking_lots LIMIT 1;
  
  IF default_lot_id IS NULL THEN
    INSERT INTO parking_lots (name, nit, address) VALUES ('Parqueadero Principal', '123456789', 'Dirección Principal') RETURNING id INTO default_lot_id;
  END IF;

  -- Update existing records to use the default lot if they don't have one
  UPDATE user_roles SET parking_lot_id = default_lot_id WHERE parking_lot_id IS NULL AND role != 'superadmin';
  UPDATE parking_sessions SET parking_lot_id = default_lot_id WHERE parking_lot_id IS NULL;
  UPDATE rates SET parking_lot_id = default_lot_id WHERE parking_lot_id IS NULL;
  UPDATE settings SET parking_lot_id = default_lot_id WHERE parking_lot_id IS NULL;
END $$;
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
