-- Add payment status tracking to residents
ALTER TABLE residents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Add index to license_plate in parking_sessions (if not already there, 20260325 migration has it but safe to re-run or check)
CREATE INDEX IF NOT EXISTS idx_parking_sessions_license_plate ON parking_sessions (license_plate);
CREATE INDEX IF NOT EXISTS idx_residents_license_plate ON residents (license_plate);
