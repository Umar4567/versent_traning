import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ruddxvktislvvulpqpvz.supabase.co',
  'sb_publishable_TyiPrNabAwlgoM0fLXQr7g_2uuZ1puT'
);

try {
  const { data, error } = await supabase.auth.getSession();
  console.log('auth data:', data);
  console.log('auth error:', error);

  const { data: testData, error: testError, status } = await supabase.from('test_results').select('id').limit(1);
  console.log('table status:', status);
  console.log('table error:', testError);
  console.log('table data:', testData);
} catch (err) {
  console.error('exception:', err.message || err);
}
