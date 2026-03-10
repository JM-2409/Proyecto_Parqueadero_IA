import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key TEXT UNIQUE NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      INSERT INTO settings (key, value)
      VALUES ('parking_capacity', '{"car": 50, "motorcycle": 30}')
      ON CONFLICT (key) DO NOTHING;

      ALTER TABLE rates ADD COLUMN IF NOT EXISTS grace_period_mins INTEGER DEFAULT 15;
    `
  });
  
  if (error) {
    console.error('Error creating settings table:', error);
  } else {
    console.log('Settings table created successfully');
  }
}

run();
