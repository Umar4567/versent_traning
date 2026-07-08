import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ruddxvktislvvulpqpvz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TyiPrNabAwlgoM0fLXQr7g_2uuZ1puT';

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Using fallback Supabase anon key from code. Set VITE_SUPABASE_ANON_KEY in .env for best practice.');
}

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseClient = client;

// Auth helpers
export const signUpWithEmail = async (email, password) => {
  return client.auth.signUp({ email, password });
};

export const signInWithEmail = async (email, password) => {
  return client.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return client.auth.signOut();
};

export const getSession = async () => {
  return client.auth.getSession();
};

export const onAuthStateChange = (cb) => client.auth.onAuthStateChange(cb);

export const getUser = async () => {
  const { data } = await client.auth.getUser();
  return data?.user || null;
};
