import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const env = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/).reduce((acc, line) => {
      const match = line.match(/^\s*([^=]+)=(.*)$/);
      if (match) {
        acc[match[1].trim()] = match[2].trim();
      }
      return acc;
    }, {})
  : {};

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://ruddxvktislvvulpqpvz.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TyiPrNabAwlgoM0fLXQr7g_2uuZ1puT';
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || null;
const useAdmin = Boolean(SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const defaultUsers = [
  { email: 'admin@example.com', password: 'Admin123!', role: 'admin' },
  { email: 'candidate@example.com', password: 'Candidate123!', role: 'candidate' },
];

const getUserByEmail = async (email) => {
  if (!useAdmin || !supabase.auth.admin?.listUsers) return null;

  const { data, error } = await supabase.auth.admin.listUsers({ limit: 100, query: email });
  if (error) {
    console.warn('Unable to list users:', error.message || error);
    return null;
  }

  const users = data?.users ?? data ?? [];
  if (!Array.isArray(users)) return null;

  return users.find((user) => user.email === email) ?? null;
};

const createOrUpdateUser = async ({ email, password, role }) => {
  console.log(`Preparing ${role} user: ${email}`);

  if (useAdmin && supabase.auth.admin?.createUser) {
    const existing = await getUserByEmail(email);
    if (existing) {
      console.log(`Existing user found for ${email}, updating password and confirming email.`);
      const { error } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { role },
      });
      if (error) {
        return { error: `Unable to update existing user: ${error.message || error}` };
      }
      return { user: existing };
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    });
    if (error) {
      return { error: error.message || error };
    }
    return { user: data.user ?? data };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.message?.toLowerCase().includes('already registered')) {
      return { error: `The account ${email} already exists. Reset the password in Supabase or provide a service role key.` };
    }
    return { error: error.message || error };
  }

  return { user: data?.user ?? data?.session?.user };
};

const upsertProfile = async ({ id, email, role }) => {
  try {
    const { error } = await supabase.from('profiles').upsert([{ id, email, role }]);
    if (error) {
      console.warn('Profile upsert failed:', error.message || error);
    }
  } catch (err) {
    console.warn('Profile creation error:', err.message || err);
  }
};

const createUser = async ({ email, password, role }) => {
  const result = await createOrUpdateUser({ email, password, role });
  if (result.error) {
    console.error(`Failed to create ${email}:`, result.error);
    return;
  }

  const userId = result.user?.id;
  console.log(`${result.user ? 'Created/updated' : 'Processed'} ${email} with ID: ${userId}`);

  if (userId) {
    await upsertProfile({ id: userId, email, role });
    console.log(`Profile saved for ${email}`);
  }
};

(async () => {
  console.log(`Using ${useAdmin ? 'service role' : 'anon'} Supabase key for seeding.`);

  for (const user of defaultUsers) {
    await createUser(user);
  }

  console.log('Default accounts:');
  console.log('  Admin: admin@example.com / Admin123!');
  console.log('  Candidate: candidate@example.com / Candidate123!');
  console.log('If the account already exists and login still fails, reset the password in Supabase Auth or provide a service role key in .env.');
})();
