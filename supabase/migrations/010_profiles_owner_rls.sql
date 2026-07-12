-- Restrict profile access: owners manage their profiles, public can view active profiles, admins manage all.

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(lower(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    OR lower(coalesce(auth.email(), '')) IN (
      'admin@admin.com',
      'yousufbadar@gmail.com'
    );
$$;

DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;

CREATE POLICY "Users read own profiles" ON profiles
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Public read active profiles" ON profiles
  FOR SELECT
  USING (active IS TRUE);

CREATE POLICY "Admins read all profiles" ON profiles
  FOR SELECT
  USING (public.is_app_admin());

CREATE POLICY "Users insert own profiles" ON profiles
  FOR INSERT
  WITH CHECK (
    user_id = 'anonymous'
    OR auth.uid()::text = user_id
    OR public.is_app_admin()
  );

CREATE POLICY "Users update own profiles" ON profiles
  FOR UPDATE
  USING (auth.uid()::text = user_id OR public.is_app_admin())
  WITH CHECK (auth.uid()::text = user_id OR public.is_app_admin());

CREATE POLICY "Users delete own profiles" ON profiles
  FOR DELETE
  USING (auth.uid()::text = user_id OR public.is_app_admin());
