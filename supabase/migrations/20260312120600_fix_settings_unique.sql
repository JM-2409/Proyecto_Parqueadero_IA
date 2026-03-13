-- Ensure settings table has a unique constraint on key and parking_lot_id
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_parking_lot_id_key;
ALTER TABLE settings ADD CONSTRAINT settings_key_parking_lot_id_key UNIQUE (key, parking_lot_id);
