ALTER TABLE parking_lot_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON parking_lot_sequences
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
