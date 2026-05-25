-- Add is_vip column and fix check_in_ticket to bypass RLS for all roles

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION check_in_ticket(p_ticket_id UUID, p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
BEGIN
  UPDATE tickets
  SET status = 'checked_in',
      checked_in_by = p_user_id,
      checked_in_at = now(),
      updated_at = now()
  WHERE id = p_ticket_id AND status = 'unused'
  RETURNING * INTO v_ticket;

  IF v_ticket.id IS NULL THEN
    SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;
    IF v_ticket.id IS NULL THEN
      RETURN jsonb_build_object('status', 'error', 'message', 'Ticket not found');
    ELSIF v_ticket.status = 'checked_in' THEN
      RETURN jsonb_build_object(
        'status', 'already_used',
        'message', 'Ticket already checked in',
        'checked_in_at', v_ticket.checked_in_at
      );
    ELSIF v_ticket.status = 'revoked' THEN
      RETURN jsonb_build_object('status', 'invalid', 'message', 'Ticket has been revoked');
    ELSE
      RETURN jsonb_build_object('status', 'invalid', 'message', 'Ticket cannot be used');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'valid',
    'message', 'Check-in successful',
    'visitor_name', v_ticket.visitor_name,
    'ticket_code', v_ticket.ticket_code,
    'is_vip', v_ticket.is_vip
  );
END;
$$;
