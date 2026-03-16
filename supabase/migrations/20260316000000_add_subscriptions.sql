ALTER TABLE parking_lots 
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz DEFAULT (now() + interval '14 days');
