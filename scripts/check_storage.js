const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://rjazltihisvxosyzohuy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYXpsdGloaXN2eG9zeXpvaHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzU0NTQsImV4cCI6MjA4ODY1MTQ1NH0.G2OUUFy2lyPHRVVbBzr66EkX7C3g7E3rON05LWOSOug';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStorage() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log('Buckets:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);

  if (data) {
    for (const bucket of data) {
      const { data: files, error: filesError } = await supabase.storage.from(bucket.name).list();
      console.log(`Files in ${bucket.name}:`, JSON.stringify(files, null, 2));
    }
  }
}
checkStorage();
