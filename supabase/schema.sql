-- =============================================================
-- Event Ticketing & Verification System — Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('master_admin', 'staff_admin', 'scanner');
CREATE TYPE ticket_status AS ENUM ('unused', 'checked_in', 'revoked');

-- 2. TABLES

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff_admin',
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code TEXT UNIQUE NOT NULL,
  visitor_name TEXT NOT NULL,
  status ticket_status DEFAULT 'unused',
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES users(id) NOT NULL,
  checked_in_by UUID REFERENCES users(id),
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  action_type TEXT NOT NULL,
  ticket_id UUID REFERENCES tickets(id),
  visitor_name TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_visitor_name ON tickets(visitor_name);
CREATE INDEX idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 4. FUNCTION: generate human-readable ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'TKT-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 5. FUNCTION: atomic check-in (race-condition-safe)
CREATE OR REPLACE FUNCTION check_in_ticket(p_ticket_id UUID, p_user_id UUID)
RETURNS JSONB
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
    'ticket_code', v_ticket.ticket_code
  );
END;
$$;

-- 6. FUNCTION: log activity automatically
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_ticket_id UUID DEFAULT NULL,
  p_visitor_name TEXT DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_logs (user_id, action_type, ticket_id, visitor_name, old_value, new_value)
  VALUES (p_user_id, p_action_type, p_ticket_id, p_visitor_name, p_old_value, p_new_value)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- 7. TRIGGER: auto-update updated_at on tickets
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tickets_updated_at();

-- 8. RLS: IMMUTABLE LOGS — prevent UPDATE/DELETE on activity_logs (master_admin can bypass)
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

CREATE TRIGGER trg_activity_logs_immutable_update
  BEFORE UPDATE ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_log_mutation();

CREATE TRIGGER trg_activity_logs_immutable_delete
  BEFORE DELETE ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_log_mutation();

-- 9. ENABLE RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS POLICIES

-- users: only master admin can manage users; others read own record
CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_select_master" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
  );

CREATE POLICY "users_insert_master" ON users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
  );

CREATE POLICY "users_update_master" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
  );

-- tickets: all authenticated users can read tickets
CREATE POLICY "tickets_select_all" ON tickets
  FOR SELECT USING (auth.role() = 'authenticated');

-- tickets: staff and master can create
CREATE POLICY "tickets_insert_staff" ON tickets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff_admin', 'master_admin'))
  );

-- tickets: only master can update (edit name, revoke)
CREATE POLICY "tickets_update_master" ON tickets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
  );

-- tickets: only master can delete
CREATE POLICY "tickets_delete_master" ON tickets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
  );

-- activity_logs: all authenticated can read logs
CREATE POLICY "activity_logs_select_all" ON activity_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- activity_logs: only the log_activity function can insert
CREATE POLICY "activity_logs_insert" ON activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- activity_logs: only master can delete
CREATE POLICY "activity_logs_delete_master" ON activity_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
  );

-- 11. TRIGGER: auto-create profile in public.users when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, password_hash, role, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'password_hash', ''),
    'scanner',
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 12. SEED instructions:
-- After running this schema, create your master admin via the Supabase dashboard:
-- 1. Go to Authentication > Users > Invite user
-- 2. Email: admin@easily.com, Password: set a strong password
-- 3. Then run: UPDATE users SET role = 'master_admin', name = 'Master Admin' WHERE email = 'admin@easily.com';
