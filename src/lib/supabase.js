import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in .env for local development and in Vercel Environment Variables for deployment.'
  );
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
