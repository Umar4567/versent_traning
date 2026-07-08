import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ruddxvktislvvulpqpvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TyiPrNabAwlgoM0fLXQr7g_2uuZ1puT';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  try {
    console.log('Checking auth endpoint...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('authError:', authError);
    console.log('authData:', authData);

    console.log('Attempting to upsert profile for a test user (no auth creation)...');
    const testId = '00000000-0000-4000-8000-000000000001';
    const { data: pData, error: pErr } = await supabase.from('profiles').upsert([{ id: testId, email: 'tester@example.com', role: 'admin' }]).select();
    console.log('profiles upsert error:', pErr);
    console.log('profiles upsert data:', pData);

    console.log('Attempting to insert a test result...');
    const payload = { total_score: 2, max_score: 10, percentage: 20, sections: JSON.stringify([]), answers: JSON.stringify({}), questions: JSON.stringify({}) };
    const { data: rData, error: rErr } = await supabase.from('test_results').insert([payload]).select();
    console.log('test_results insert error:', rErr);
    console.log('test_results insert data:', rData);
  } catch (err) {
    console.error('exception:', err.message || err);
  }
})();
