-- Create `profiles` table to store user roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  role text DEFAULT 'candidate',
  user_id_custom text,
  created_at timestamptz DEFAULT now()
);

-- Create `test_results` table for storing results
CREATE TABLE IF NOT EXISTS public.test_results (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  total_score integer,
  max_score integer,
  percentage integer,
  sections jsonb,
  answers jsonb,
  questions jsonb
);

-- Insert profile rows for admin and candidate users based on auth.users email
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role;

INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'candidate'
FROM auth.users
WHERE email = 'candidate@example.com'
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role;

-- Optional: insert a sample test result row
INSERT INTO public.test_results (total_score, max_score, percentage, sections, answers, questions)
VALUES (
  3,
  10,
  30,
  '[{"name":"Typing","count":1}]',
  '{}',
  '{}'
);

-- NOTE: If you prefer to reference auth.users for `profiles.id`, alter the table
-- to add a foreign key referencing `auth.users(id)` after confirming users exist.
