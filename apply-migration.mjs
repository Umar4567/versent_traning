import fetch from 'node-fetch';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ruddxvktislvvulpqpvz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  process.exit(1);
}

const runMigration = async () => {
  try {
    console.log('Checking if user_id_custom column exists in profiles table...');
    
    // First check if column exists
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=user_id_custom&limit=0`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (checkResponse.ok) {
      console.log('✅ Column user_id_custom already exists in profiles table');
      process.exit(0);
    }

    console.log('⚠️  Column does not exist yet. You need to add it through Supabase Web UI:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run this SQL:');
    console.log('   ALTER TABLE public.profiles ADD COLUMN user_id_custom text;');
    console.log('4. After running, restart the app');
    
  } catch (err) {
    console.error('❌ Check failed:', err.message);
    process.exit(1);
  }
};

runMigration();
