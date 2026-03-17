-- Enable RLS on all tables
ALTER TABLE IF EXISTS parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS parking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehicle_novelties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS parking_lot_sequences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Policies for parking_lots
CREATE POLICY "Allow authenticated users to read parking_lots" ON parking_lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow superadmins to insert parking_lots" ON parking_lots FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Allow superadmins to update parking_lots" ON parking_lots FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Allow superadmins to delete parking_lots" ON parking_lots FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin'));

-- Policies for user_roles
CREATE POLICY "Allow authenticated users to read user_roles" ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to insert their own role" ON user_roles FOR INSERT TO authenticated WITH CHECK (
  (user_id = auth.uid() AND (role = 'guard' OR NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'superadmin'))) OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin'))
);
CREATE POLICY "Allow superadmins and admins to update user_roles" ON user_roles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin')));
CREATE POLICY "Allow superadmins and admins to delete user_roles" ON user_roles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin')));

-- Policies for rates
CREATE POLICY "Allow authenticated users to read rates" ON rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins to manage rates" ON rates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin')));

-- Policies for parking_sessions
CREATE POLICY "Allow authenticated users to read parking_sessions" ON parking_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow guards and admins to manage parking_sessions" ON parking_sessions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin', 'guard')));

-- Policies for settings
CREATE POLICY "Allow authenticated users to read settings" ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins to manage settings" ON settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin')));

-- Policies for vehicle_novelties
CREATE POLICY "Allow authenticated users to read vehicle_novelties" ON vehicle_novelties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow guards and admins to manage vehicle_novelties" ON vehicle_novelties FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin', 'guard')));

-- Policies for parking_lot_sequences
CREATE POLICY "Allow authenticated users to read parking_lot_sequences" ON parking_lot_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert parking_lot_sequences" ON parking_lot_sequences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update parking_lot_sequences" ON parking_lot_sequences FOR UPDATE TO authenticated USING (true);
