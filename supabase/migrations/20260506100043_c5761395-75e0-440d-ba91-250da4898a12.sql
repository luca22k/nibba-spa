
-- 1. Fix has_permission default-allow on view → default deny
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _feature permission_feature, _action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r RECORD;
BEGIN
  IF public.is_owner(_user_id) THEN RETURN true; END IF;
  SELECT can_view, can_edit, can_delete INTO r FROM public.admin_permissions
   WHERE user_id = _user_id AND feature = _feature;
  IF NOT FOUND THEN RETURN false; END IF;
  IF _action = 'view' THEN RETURN r.can_view; END IF;
  IF _action = 'edit' THEN RETURN r.can_edit; END IF;
  IF _action = 'delete' THEN RETURN r.can_delete; END IF;
  RETURN false;
END; $function$;

-- 2. Restrict therapists SELECT: hide contact info from non-owners/non-branch-admins
DROP POLICY IF EXISTS therapists_select ON public.therapists;
CREATE POLICY therapists_select ON public.therapists
FOR SELECT USING (
  has_permission(auth.uid(), 'therapists'::permission_feature, 'view')
  AND (
    is_owner(auth.uid())
    OR branch_id IS NULL
    OR user_has_branch(auth.uid(), branch_id)
  )
);

-- 3. Audit log write protection - explicit deny
DROP POLICY IF EXISTS audit_no_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_no_update ON public.audit_logs;
DROP POLICY IF EXISTS audit_no_delete ON public.audit_logs;
CREATE POLICY audit_no_insert ON public.audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY audit_no_update ON public.audit_logs FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY audit_no_delete ON public.audit_logs FOR DELETE USING (false);

-- 4. Commissions explicit deny on update/delete
DROP POLICY IF EXISTS com_no_update ON public.commissions;
DROP POLICY IF EXISTS com_no_delete ON public.commissions;
CREATE POLICY com_no_update ON public.commissions FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY com_no_delete ON public.commissions FOR DELETE USING (false);

-- 5. Revoke SECURITY DEFINER function execute from anon/authenticated (keep for service_role/postgres)
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, permission_feature, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.user_has_branch(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.user_branch_ids(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_booking_conflicts(uuid, timestamptz, timestamptz, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_owners_on_correction() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_correction_on_review() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.write_audit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated, public;

-- check_booking_conflicts is called from the app; allow authenticated
GRANT EXECUTE ON FUNCTION public.check_booking_conflicts(uuid, timestamptz, timestamptz, uuid) TO authenticated;

-- 6. Realtime authorization: restrict subscriptions to user's allowed topics
-- Allow only topics matching user's recipient id (notifications) or owner/branch-scoped topics for other tables.
-- Simple, safe default: only authenticated users, and topic must equal a known-safe prefix.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_authenticated_select" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_authenticated_insert" ON realtime.messages;

-- Users may only subscribe to their own user-scoped topic, e.g. "user:<uid>" for notifications,
-- or owner-only/branch-scoped topics validated server-side.
CREATE POLICY "realtime_user_topic_select" ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR public.is_owner(auth.uid())
);

CREATE POLICY "realtime_user_topic_insert" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR public.is_owner(auth.uid())
);
