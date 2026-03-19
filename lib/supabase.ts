import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rjazltihisvxosyzohuy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYXpsdGloaXN2eG9zeXpvaHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzU0NTQsImV4cCI6MjA4ODY1MTQ1NH0.G2OUUFy2lyPHRVVbBzr66EkX7C3g7E3rON05LWOSOug';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
