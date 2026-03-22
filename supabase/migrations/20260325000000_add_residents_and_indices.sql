-- Create residents table
CREATE TABLE IF NOT EXISTS residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate TEXT NOT NULL,
  tower TEXT,
  apartment TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(license_plate, parking_lot_id)
);

-- Enable RLS on residents
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for residents
-- Only allow users to see residents for their assigned parking lot
CREATE POLICY "Allow authenticated users to read residents"
  ON residents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND (parking_lot_id = residents.parking_lot_id OR role = 'superadmin')
    )
  );

CREATE POLICY "Allow admins to manage residents"
  ON residents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND (parking_lot_id = residents.parking_lot_id OR role = 'superadmin')
    )
  );

-- Add index to parking_sessions for license_plate
CREATE INDEX IF NOT EXISTS idx_parking_sessions_license_plate ON parking_sessions (license_plate);

-- Add index to residents for license_plate
CREATE INDEX IF NOT EXISTS idx_residents_license_plate ON residents (license_plate);

-- Add is_resident column to parking_sessions for reporting
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS is_resident BOOLEAN DEFAULT FALSE;
