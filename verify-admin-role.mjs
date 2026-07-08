import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const env = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/).reduce((acc, line) => {
      const match = line.match(/^\s*([^=]+)=(.*)$/);
      if (match) acc[match[1].trim()] = match[2].trim();
      return acc;
    }, {})
  : {};

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || (!serviceKey && !anonKey)) {
  throw new Error('Missing Supabase configuration in .env');
}
const supabase = createClient(supabaseUrl, serviceKey || anonKey, { auth: { persistSession: false } });

const run = async () => {
  const email = 'admin@example.com';
  console.log('Using', serviceKey ? 'service role key' : 'anon key');
  const { data, error } = await supabase.from('profiles').select('id,email,role').eq('email', email);
  console.log('query error:', error);
  console.log('query data:', JSON.stringify(data, null, 2));

  if (!error && data?.length) {
    const row = data[0];
    if (row.role !== 'admin') {
      console.log('Updating role to admin');
      const { error: updateError, data: updated } = await supabase.from('profiles').upsert([{ id: row.id, email: row.email, role: 'admin' }]);
      console.log('update error:', updateError);
      console.log('updated:', JSON.stringify(updated, null, 2));
    } else {
      console.log('Role is already admin');
    }
  }
};

run().catch((err) => {
  console.error('failed', err);
  process.exit(1);
});
