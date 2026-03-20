const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://rjazltihisvxosyzohuy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYXpsdGloaXN2eG9zeXpvaHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzU0NTQsImV4cCI6MjA4ODY1MTQ1NH0.G2OUUFy2lyPHRVVbBzr66EkX7C3g7E3rON05LWOSOug';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkGlobalSettings() {
  const { data, error } = await supabase.from('global_app_settings').select('*');
  console.log('Global App Settings:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);

  const { data: lots, error: lotsError } = await supabase.from('parking_lots').select('id, name, logo_url');
  console.log('Parking Lots:', JSON.stringify(lots, null, 2));
}
checkGlobalSettings();
