-- Add ticket_number column
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS ticket_number INTEGER;

-- Create sequence per parking lot
CREATE TABLE IF NOT EXISTS parking_lot_sequences (
  parking_lot_id UUID PRIMARY KEY REFERENCES parking_lots(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0
);

-- Function to get next ticket number
CREATE OR REPLACE FUNCTION get_next_ticket_number(p_lot_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next_val INTEGER;
BEGIN
  INSERT INTO parking_lot_sequences (parking_lot_id, current_value)
  VALUES (p_lot_id, 1)
  ON CONFLICT (parking_lot_id) DO UPDATE
  SET current_value = parking_lot_sequences.current_value + 1
  RETURNING current_value INTO v_next_val;
  
  RETURN v_next_val;
END;
$$ LANGUAGE plpgsql;

-- Trigger function
CREATE OR REPLACE FUNCTION assign_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := get_next_ticket_number(NEW.parking_lot_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_ticket_number ON parking_sessions;
CREATE TRIGGER set_ticket_number
BEFORE INSERT ON parking_sessions
FOR EACH ROW
EXECUTE FUNCTION assign_ticket_number();

-- Fix foreign keys to CASCADE on delete for parking_lots
-- First, drop existing constraints
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name, table_name
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name IN ('user_roles', 'rates', 'parking_sessions', 'settings')
  ) LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

-- Add them back with CASCADE
ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_parking_lot_id_fkey 
  FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

ALTER TABLE rates 
  ADD CONSTRAINT rates_parking_lot_id_fkey 
  FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

ALTER TABLE parking_sessions 
  ADD CONSTRAINT parking_sessions_parking_lot_id_fkey 
  FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

ALTER TABLE settings 
  ADD CONSTRAINT settings_parking_lot_id_fkey 
  FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;
