-- Add DELETE policy for master_admin on tickets table

CREATE POLICY "tickets_delete_master" ON tickets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
  );
