-- Allow master_admin to delete activity_logs (bypass immutable trigger)
-- Add analytics-related RLS policies

-- 1. Modify trigger function to allow master_admin to bypass
CREATE OR REPLACE FUNCTION prevent_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'activity_logs are append-only. UPDATE/DELETE not allowed.';
END;
$$;

-- 2. Add DELETE policy for master_admin on activity_logs
CREATE POLICY "activity_logs_delete_master" ON activity_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
  );
