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
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') OR
  (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND parking_lot_id = user_roles.parking_lot_id) AND role != 'superadmin')
);

CREATE POLICY "Allow superadmins to update user_roles" ON user_roles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Allow admins to update user_roles" ON user_roles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND parking_lot_id = user_roles.parking_lot_id)
) WITH CHECK (
  role != 'superadmin'
);

CREATE POLICY "Allow superadmins to delete user_roles" ON user_roles FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Allow admins to delete user_roles" ON user_roles FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND parking_lot_id = user_roles.parking_lot_id)
);

-- Policies for rates
CREATE POLICY "Allow authenticated users to read rates" ON rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins to manage rates" ON rates FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND parking_lot_id = rates.parking_lot_id)
);

-- Policies for parking_sessions
CREATE POLICY "Allow authenticated users to read parking_sessions" ON parking_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow guards and admins to manage parking_sessions" ON parking_sessions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'guard') AND parking_lot_id = parking_sessions.parking_lot_id)
);

-- Policies for settings
CREATE POLICY "Allow authenticated users to read settings" ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins to manage settings" ON settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND parking_lot_id = settings.parking_lot_id)
);

-- Policies for vehicle_novelties
CREATE POLICY "Allow authenticated users to read vehicle_novelties" ON vehicle_novelties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow guards and admins to manage vehicle_novelties" ON vehicle_novelties FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'guard') AND parking_lot_id = vehicle_novelties.parking_lot_id)
);

-- Policies for parking_lot_sequences
CREATE POLICY "Allow authenticated users to read parking_lot_sequences" ON parking_lot_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow guards and admins to manage parking_lot_sequences" ON parking_lot_sequences FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'guard') AND parking_lot_id = parking_lot_sequences.parking_lot_id)
);

-- Policies for global_app_settings
CREATE POLICY "Anyone can read global app settings" ON global_app_settings FOR SELECT USING (true);
CREATE POLICY "Superadmins can update global app settings" ON global_app_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);
