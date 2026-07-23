const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Las variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY son requeridas'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;
