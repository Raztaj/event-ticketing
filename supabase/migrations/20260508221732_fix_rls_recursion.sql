-- Fix RLS infinite recursion on users table
-- The old policy queried the users table, causing recursion
-- New approach: use a SECURITY DEFINER function to bypass RLS

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "users_select_master" ON users;

CREATE POLICY "users_select_master" ON users
  FOR SELECT USING (
    get_user_role() = 'master_admin'
  );
