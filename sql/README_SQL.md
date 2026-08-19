Run these SQL statements in the Supabase dashboard (SQL Editor) to create tables used by the app.

Steps:
1. Open your Supabase project.
2. Go to "SQL" -> "New query".
3. Paste the contents of `create_profiles_and_test_results.sql`.
4. Run the query.
5. Then run `enable_rls_for_hostinger.sql` to allow the static Hostinger app to
   read and write through Supabase securely.

Notes:
- The `profiles.id` column is a plain uuid here (does not enforce a foreign key to `auth.users`).
  If you want strong referential integrity, add a foreign key to `auth.users(id)` after creating users.
- The app uses a Supabase Edge Function named `admin-register-candidate` for
  admin-only account creation. Deploy `supabase/functions/admin-register-candidate`
  before using the Register Candidate button.
