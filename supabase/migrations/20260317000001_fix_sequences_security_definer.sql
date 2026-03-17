-- Make the function SECURITY DEFINER so it bypasses RLS
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
