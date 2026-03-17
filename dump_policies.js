const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function dump() {
  const { data, error } = await supabase.rpc('get_policies');
  if (error) {
    console.error('Error fetching policies via RPC, trying direct query if possible...');
  } else {
    console.log(data);
  }
}

dump();
