-- Run this after create_profiles_and_test_results.sql.
-- It permits candidates to submit their own results and permits admins to view
-- candidates and all results, without exposing the Supabase service-role key.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "profiles: read own or admin" ON public.profiles;
CREATE POLICY "profiles: read own or admin"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "results: admin read" ON public.test_results;
CREATE POLICY "results: admin read"
ON public.test_results FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "results: candidate insert own" ON public.test_results;
CREATE POLICY "results: candidate insert own"
ON public.test_results FOR INSERT TO authenticated
WITH CHECK ((answers -> 'meta' ->> 'authUserId') = auth.uid()::text);
