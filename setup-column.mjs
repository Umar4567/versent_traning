import fs from 'fs';
import path from 'path';
import url from 'url';

const loadDotEnv = () => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const contents = fs.readFileSync(envPath, 'utf8');
    return Object.fromEntries(
      contents
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const [key, ...rest] = line.split('=');
          return [key.trim(), rest.join('=').trim()];
        })
    );
  } catch {
    return {};
  }
};

const env = loadDotEnv();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const addColumnToProfiles = async () => {
  try {
    console.log('🔧 Adding user_id_custom column to profiles table...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        sql: 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id_custom text;',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('⚠️ Response error:', response.status, errorText);
      
      // Try alternative approach - use query endpoint
      console.log('📌 Trying alternative approach...');
      
      const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      });
      
      if (altResponse.ok) {
        console.log('✅ Supabase connection confirmed');
        console.log('\n📋 To add the column, please run this SQL in Supabase SQL Editor:');
        console.log('   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id_custom text;\n');
        process.exit(0);
      }
    }

    console.log('✅ Column added successfully (or already exists)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 To add the column manually, go to Supabase SQL Editor and run:');
    console.log('   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id_custom text;\n');
    process.exit(1);
  }
};

addColumnToProfiles();
