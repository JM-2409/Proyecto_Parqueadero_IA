const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseUrl = 'https://rjazltihisvxosyzohuy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYXpsdGloaXN2eG9zeXpvaHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzU0NTQsImV4cCI6MjA4ODY1MTQ1NH0.G2OUUFy2lyPHRVVbBzr66EkX7C3g7E3rON05LWOSOug';
// Using service role key would be better but I only have anon.
// I'll use the API to update via SQL for the DB part.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function uploadLogo() {
  const fileData = fs.readFileSync('public/logo.png');
  const fileName = `app_logo_${Date.now()}.png`;

  console.log('Uploading logo...');
  const { data, error } = await supabase.storage
    .from('logos')
    .upload(fileName, fileData, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) {
    console.error('Upload error:', error);
    return;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('logos')
    .getPublicUrl(fileName);

  console.log('Public URL:', publicUrl);

  // Now update global_app_settings via SQL API (since I have the token)
  const ref = 'rjazltihisvxosyzohuy';
  const token = 'sbp_2a3365320806f496cafb233002ec3dd75766e6b2';

  const sql = `
    UPDATE global_app_settings
    SET logo_url = '${publicUrl}', updated_at = NOW()
    WHERE id = (SELECT id FROM global_app_settings LIMIT 1);

    UPDATE parking_lots
    SET logo_url = '${publicUrl}'
    WHERE logo_url IS NULL;
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const sqlResult = await res.json();
  console.log('SQL Result:', sqlResult);
}

uploadLogo();
