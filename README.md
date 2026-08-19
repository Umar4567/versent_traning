# Versant React App

## Hostinger + Supabase deployment

Use these Hostinger settings: root directory `./`, build command `npm run build`,
output directory `dist`, and leave the Node entry file empty.

Add only these browser-safe environment variables in Hostinger:

```text
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase publishable key>
```

Run `sql/create_profiles_and_test_results.sql` followed by
`sql/enable_rls_for_hostinger.sql` in the Supabase SQL Editor. Deploy the
`supabase/functions/admin-register-candidate` Edge Function for secure
admin-only candidate registration. Never add service-role, OpenAI, or
Pollinations secrets to Hostinger.

## Seed default users

Run the seed script to create admin and candidate accounts in Supabase:

```bash
npm run seed
```

Default credentials:

- Admin: `admin@example.com`
- Password: `Admin123!`

- Candidate: `candidate@example.com`
- Password: `Candidate123!`

The seed script also upserts a `profiles` record with `role` set to `admin` or `candidate`.
