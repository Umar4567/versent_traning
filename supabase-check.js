const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabase = createClient(
  'https://ruddxvktislvvulpqpvz.supabase.co',
  'sb_publishable_TyiPrNabAwlgoM0fLXQr7g_2uuZ1puT'
);

(async () => {
  try {
    const { data, error, status } = await supabase.from('test_results').select('id').limit(1);
    console.log('status:', status);
    console.log('error:', error);
    console.log('data:', data);
  } catch (err) {
    console.error('exception:', err);
  }
})();
