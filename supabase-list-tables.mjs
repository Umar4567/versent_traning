import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ruddxvktislvvulpqpvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TyiPrNabAwlgoM0fLXQr7g_2uuZ1puT';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

try {
  const { data: authData, error: authError } = await supabase.auth.getSession();
  console.log('auth error:', authError);
  console.log('auth data:', authData);

  const { data, error, status } = await supabase
    .from('information_schema.tables')
    .select('table_schema,table_name')
    .eq('table_schema', 'public')
    .order('table_name', { ascending: true });

  console.log('status:', status);
  console.log('error:', error);
  console.log('tables:', data);
} catch (err) {
  console.error('exception:', err.message || err);
}
