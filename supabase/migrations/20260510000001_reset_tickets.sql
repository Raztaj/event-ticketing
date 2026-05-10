CREATE OR REPLACE FUNCTION reset_all_tickets(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE tickets
  SET status = 'unused',
      checked_in_by = NULL,
      checked_in_at = NULL,
      updated_at = now()
  WHERE status IN ('checked_in', 'unused')
  RETURNING COUNT(*) INTO v_count;

  INSERT INTO activity_logs (user_id, action_type, old_value, new_value)
  VALUES (
    p_user_id,
    'tickets_reset',
    jsonb_build_object('count', v_count),
    jsonb_build_object('status', 'all_reset_to_unused')
  );

  RETURN v_count;
END;
$$;
