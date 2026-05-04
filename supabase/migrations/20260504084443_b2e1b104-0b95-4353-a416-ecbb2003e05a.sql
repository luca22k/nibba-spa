
-- Correction status enum
CREATE TYPE public.correction_status AS ENUM ('pending_owner_review','approved','rejected');
CREATE TYPE public.correction_field AS ENUM ('clock_in','clock_out','status');

-- attendance_corrections
CREATE TABLE public.attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  attendance_id UUID NOT NULL,
  field public.correction_field NOT NULL,
  current_value TEXT,
  requested_value TEXT,
  reason TEXT NOT NULL,
  status public.correction_status NOT NULL DEFAULT 'pending_owner_review',
  submitted_by UUID NOT NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY ac_insert ON public.attendance_corrections
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'attendance', 'edit')
    AND user_has_branch(auth.uid(), branch_id)
    AND submitted_by = auth.uid()
  );

CREATE POLICY ac_select ON public.attendance_corrections
  FOR SELECT USING (
    is_owner(auth.uid())
    OR submitted_by = auth.uid()
    OR (has_permission(auth.uid(), 'attendance', 'view') AND user_has_branch(auth.uid(), branch_id))
  );

CREATE POLICY ac_owner_update ON public.attendance_corrections
  FOR UPDATE USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

CREATE TRIGGER ac_updated_at BEFORE UPDATE ON public.attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  related_entity TEXT,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_select ON public.notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY notif_update ON public.notifications
  FOR UPDATE USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);

-- Trigger: on correction insert, notify owners
CREATE OR REPLACE FUNCTION public.notify_owners_on_correction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'owner' LOOP
    INSERT INTO public.notifications(recipient_id, type, title, body, link, related_entity, related_id)
    VALUES (r.user_id, 'attendance_correction',
            'Attendance correction requested',
            'A correction needs your review.',
            '/attendance/corrections',
            'attendance_corrections', NEW.id);
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_owners_correction AFTER INSERT ON public.attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION public.notify_owners_on_correction();

-- Trigger: on correction status change → apply or notify
CREATE OR REPLACE FUNCTION public.apply_correction_on_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' THEN
    IF NEW.field = 'clock_in' THEN
      UPDATE public.attendance_records SET clock_in = NEW.requested_value::timestamptz, updated_at = now() WHERE id = NEW.attendance_id;
    ELSIF NEW.field = 'clock_out' THEN
      UPDATE public.attendance_records SET clock_out = NEW.requested_value::timestamptz, updated_at = now() WHERE id = NEW.attendance_id;
    ELSIF NEW.field = 'status' THEN
      UPDATE public.attendance_records SET status = NEW.requested_value::attendance_status, updated_at = now() WHERE id = NEW.attendance_id;
    END IF;

    INSERT INTO public.notifications(recipient_id, type, title, body, link, related_entity, related_id)
    VALUES (NEW.submitted_by, 'correction_approved', 'Correction approved',
            'Your attendance correction was approved.',
            '/attendance', 'attendance_corrections', NEW.id);
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications(recipient_id, type, title, body, link, related_entity, related_id)
    VALUES (NEW.submitted_by, 'correction_rejected', 'Correction rejected',
            COALESCE(NEW.reviewer_note, 'Your attendance correction was rejected.'),
            '/attendance', 'attendance_corrections', NEW.id);
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_apply_correction_review AFTER UPDATE ON public.attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION public.apply_correction_on_review();

-- Audit triggers (write_audit already exists)
CREATE TRIGGER aud_attendance_records AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER aud_attendance_corrections AFTER INSERT OR UPDATE OR DELETE ON public.attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER aud_branches AFTER INSERT OR UPDATE OR DELETE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER aud_branch_admins AFTER INSERT OR UPDATE OR DELETE ON public.branch_admins
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER aud_rooms AFTER INSERT OR UPDATE OR DELETE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER aud_therapists AFTER INSERT OR UPDATE OR DELETE ON public.therapists
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_corrections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_corrections;
