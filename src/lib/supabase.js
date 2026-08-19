import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const client = hasSupabaseConfig ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const supabaseClient = client;

// Auth helpers
export const signUpWithEmail = async (email, password) => {
  if (!client) return { data: null, error: new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.') };
  return client.auth.signUp({ email, password });
};

export const signInWithEmail = async (email, password) => {
  if (!client) return { data: null, error: new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.') };
  return client.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  if (!client) return { error: null };
  return client.auth.signOut();
};

export const getSession = async () => {
  if (!client) return { data: { session: null }, error: null };
  return client.auth.getSession();
};

export const onAuthStateChange = (cb) => (
  client ? client.auth.onAuthStateChange(cb) : { data: { subscription: { unsubscribe() {} } } }
);

export const getUser = async () => {
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user || null;
};
