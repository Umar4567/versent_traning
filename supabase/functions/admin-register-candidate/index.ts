import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json({ error: 'Function is not configured or the request is unauthenticated.' }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: 'You must sign in first.' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();

  if (profileError || callerProfile?.role !== 'admin') {
    return json({ error: 'Only administrators can register candidates.' }, 403);
  }

  const { userId, email, password } = await request.json().catch(() => ({}));
  if (!userId || !email || !password) return json({ error: 'User ID, email, and password are required.' }, 400);

  const { data, error } = await adminClient.auth.admin.createUser({
    email: String(email).trim().toLowerCase(),
    password: String(password),
    email_confirm: true,
    user_metadata: { role: 'candidate', userId: String(userId).trim() },
  });
  if (error || !data.user) return json({ error: error?.message || 'Candidate registration failed.' }, 400);

  const { error: upsertError } = await adminClient.from('profiles').upsert({
    id: data.user.id,
    email: data.user.email,
    role: 'candidate',
    user_id_custom: String(userId).trim(),
  });
  if (upsertError) return json({ error: upsertError.message }, 500);

  return json({ user: { id: data.user.id, email: data.user.email } });
});
