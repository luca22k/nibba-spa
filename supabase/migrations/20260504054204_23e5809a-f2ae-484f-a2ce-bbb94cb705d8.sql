
-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('owner', 'admin');
CREATE TYPE public.permission_feature AS ENUM ('bookings','customers','therapists','attendance','payments','reports','services_pricing','audit_log');
CREATE TYPE public.booking_type AS ENUM ('walk_in','phone','online','repeat');
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','in_progress','completed','cancelled','no_show');
CREATE TYPE public.payment_method AS ENUM ('cash','card','gcash','maya','bank_transfer','other');
CREATE TYPE public.payment_status AS ENUM ('unpaid','partially_paid','paid','refunded','cancelled');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','leave','off_duty');
CREATE TYPE public.service_category AS ENUM ('massage','package','add_on','home_service');
CREATE TYPE public.therapist_status AS ENUM ('active','inactive','on_leave');

-- ============== HELPER FUNCTIONS ==============
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============== ROLES ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner');
$$;

-- ============== BRANCHES ==============
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_number TEXT,
  opening_time TIME NOT NULL DEFAULT '10:00',
  closing_time TIME NOT NULL DEFAULT '22:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- ============== BRANCH ADMINS ==============
CREATE TABLE public.branch_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch_id)
);
ALTER TABLE public.branch_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_branch(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_owner(_user_id) OR EXISTS(
    SELECT 1 FROM public.branch_admins WHERE user_id = _user_id AND branch_id = _branch_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_branch_ids(_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT branch_id FROM public.branch_admins WHERE user_id = _user_id;
$$;

-- ============== ADMIN PERMISSIONS ==============
CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature permission_feature NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT true,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature)
);
CREATE TRIGGER admin_permissions_updated BEFORE UPDATE ON public.admin_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _feature permission_feature, _action TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF public.is_owner(_user_id) THEN RETURN true; END IF;
  SELECT can_view, can_edit, can_delete INTO r FROM public.admin_permissions
   WHERE user_id = _user_id AND feature = _feature;
  IF NOT FOUND THEN RETURN _action = 'view'; END IF;
  IF _action = 'view' THEN RETURN r.can_view; END IF;
  IF _action = 'edit' THEN RETURN r.can_edit; END IF;
  IF _action = 'delete' THEN RETURN r.can_delete; END IF;
  RETURN false;
END; $$;

-- ============== ROOMS ==============
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER rooms_updated BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- ============== SERVICES ==============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category service_category NOT NULL DEFAULT 'massage',
  duration_minutes INT NOT NULL DEFAULT 60,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.service_branch_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_id, branch_id)
);
CREATE TRIGGER sbp_updated BEFORE UPDATE ON public.service_branch_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.service_branch_pricing ENABLE ROW LEVEL SECURITY;

-- ============== THERAPISTS ==============
CREATE TABLE public.therapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  employment_status therapist_status NOT NULL DEFAULT 'active',
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER therapists_updated BEFORE UPDATE ON public.therapists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.therapist_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  UNIQUE(therapist_id, service_id)
);
ALTER TABLE public.therapist_skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.therapist_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  is_off BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(therapist_id, day_of_week)
);
CREATE TRIGGER ts_updated BEFORE UPDATE ON public.therapist_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.therapist_schedules ENABLE ROW LEVEL SECURITY;

-- ============== ATTENDANCE ==============
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  late_minutes INT NOT NULL DEFAULT 0,
  undertime_minutes INT NOT NULL DEFAULT 0,
  overtime_minutes INT NOT NULL DEFAULT 0,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(therapist_id, date)
);
CREATE TRIGGER attendance_updated BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- ============== CUSTOMERS ==============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  allergies TEXT,
  notes TEXT,
  preferred_therapist_id UUID REFERENCES public.therapists(id) ON DELETE SET NULL,
  last_visit_date DATE,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_name ON public.customers(lower(full_name));
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ============== BOOKINGS ==============
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  therapist_id UUID REFERENCES public.therapists(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  booking_type booking_type NOT NULL DEFAULT 'walk_in',
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  payment_method payment_method,
  is_home_service BOOLEAN NOT NULL DEFAULT false,
  service_address TEXT,
  notes TEXT,
  created_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_bookings_branch_date ON public.bookings(branch_id, booking_date);
CREATE INDEX idx_bookings_therapist_time ON public.bookings(therapist_id, start_time, end_time);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status booking_status,
  to_status booking_status NOT NULL,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

-- ============== PAYMENTS ==============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  therapist_id UUID REFERENCES public.therapists(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  method payment_method NOT NULL DEFAULT 'cash',
  status payment_status NOT NULL DEFAULT 'unpaid',
  date_paid TIMESTAMPTZ,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  earned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- ============== AUDIT LOG ==============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  branch_id UUID,
  action_type TEXT NOT NULL,
  entity TEXT NOT NULL,
  record_id UUID,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_branch ON public.audit_logs(branch_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============== MEMBERSHIPS (V2 placeholders) ==============
CREATE TABLE public.membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.customer_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;

-- ============== AUDIT TRIGGER ==============
CREATE OR REPLACE FUNCTION public.write_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_branch UUID;
  v_old JSONB;
  v_new JSONB;
  v_record UUID;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = v_user;
  SELECT CASE WHEN public.is_owner(v_user) THEN 'owner' ELSE 'admin' END INTO v_role;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_record := OLD.id;
    v_branch := (v_old->>'branch_id')::UUID;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_record := NEW.id;
    v_branch := COALESCE((v_new->>'branch_id')::UUID, (v_old->>'branch_id')::UUID);
  ELSE
    v_new := to_jsonb(NEW); v_record := NEW.id;
    v_branch := (v_new->>'branch_id')::UUID;
  END IF;

  INSERT INTO public.audit_logs(user_id,user_name,user_role,branch_id,action_type,entity,record_id,previous_value,new_value)
  VALUES (v_user, v_name, v_role, v_branch, TG_OP, TG_TABLE_NAME, v_record, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER audit_bookings AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_services AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_sbp AFTER INSERT OR UPDATE OR DELETE ON public.service_branch_pricing
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_admin_perms AFTER INSERT OR UPDATE OR DELETE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_branches AFTER INSERT OR UPDATE OR DELETE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_therapists AFTER INSERT OR UPDATE OR DELETE ON public.therapists
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_attendance AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();

-- ============== RLS POLICIES ==============

-- profiles
CREATE POLICY profiles_self_or_owner_select ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_owner(auth.uid()));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_owner(auth.uid()));
CREATE POLICY profiles_owner_insert ON public.profiles FOR INSERT
  WITH CHECK (public.is_owner(auth.uid()) OR auth.uid() = id);

-- user_roles
CREATE POLICY user_roles_self_select ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_owner(auth.uid()));
CREATE POLICY user_roles_owner_all ON public.user_roles FOR ALL
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- branch_admins
CREATE POLICY ba_self_select ON public.branch_admins FOR SELECT
  USING (auth.uid() = user_id OR public.is_owner(auth.uid()));
CREATE POLICY ba_owner_all ON public.branch_admins FOR ALL
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- admin_permissions
CREATE POLICY ap_self_select ON public.admin_permissions FOR SELECT
  USING (auth.uid() = user_id OR public.is_owner(auth.uid()));
CREATE POLICY ap_owner_all ON public.admin_permissions FOR ALL
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- branches
CREATE POLICY branches_select ON public.branches FOR SELECT
  USING (public.is_owner(auth.uid()) OR public.user_has_branch(auth.uid(), id));
CREATE POLICY branches_owner_modify ON public.branches FOR ALL
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- rooms
CREATE POLICY rooms_select ON public.rooms FOR SELECT
  USING (public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY rooms_owner_modify ON public.rooms FOR ALL
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- services (visible to all authenticated; only owner or permitted admin can modify)
CREATE POLICY services_select ON public.services FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.has_permission(auth.uid(),'services_pricing','view'));
CREATE POLICY services_modify ON public.services FOR ALL
  USING (public.has_permission(auth.uid(),'services_pricing','edit'))
  WITH CHECK (public.has_permission(auth.uid(),'services_pricing','edit'));

-- service_branch_pricing
CREATE POLICY sbp_select ON public.service_branch_pricing FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.has_permission(auth.uid(),'services_pricing','view'));
CREATE POLICY sbp_modify ON public.service_branch_pricing FOR ALL
  USING (public.has_permission(auth.uid(),'services_pricing','edit'))
  WITH CHECK (public.has_permission(auth.uid(),'services_pricing','edit'));

-- therapists
CREATE POLICY therapists_select ON public.therapists FOR SELECT
  USING (public.has_permission(auth.uid(),'therapists','view') AND
         (public.is_owner(auth.uid()) OR branch_id IS NULL OR public.user_has_branch(auth.uid(), branch_id)));
CREATE POLICY therapists_insert ON public.therapists FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(),'therapists','edit') AND
              (public.is_owner(auth.uid()) OR public.user_has_branch(auth.uid(), branch_id)));
CREATE POLICY therapists_update ON public.therapists FOR UPDATE
  USING (public.has_permission(auth.uid(),'therapists','edit') AND
         (public.is_owner(auth.uid()) OR public.user_has_branch(auth.uid(), branch_id)));
CREATE POLICY therapists_delete ON public.therapists FOR DELETE
  USING (public.has_permission(auth.uid(),'therapists','delete') AND public.is_owner(auth.uid()));

-- therapist_skills
CREATE POLICY ts_skills_select ON public.therapist_skills FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY ts_skills_modify ON public.therapist_skills FOR ALL
  USING (public.has_permission(auth.uid(),'therapists','edit'))
  WITH CHECK (public.has_permission(auth.uid(),'therapists','edit'));

-- therapist_schedules
CREATE POLICY ts_sched_select ON public.therapist_schedules FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY ts_sched_modify ON public.therapist_schedules FOR ALL
  USING (public.has_permission(auth.uid(),'therapists','edit'))
  WITH CHECK (public.has_permission(auth.uid(),'therapists','edit'));

-- attendance
CREATE POLICY att_select ON public.attendance_records FOR SELECT
  USING (public.has_permission(auth.uid(),'attendance','view') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY att_insert ON public.attendance_records FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(),'attendance','edit') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY att_update ON public.attendance_records FOR UPDATE
  USING (public.has_permission(auth.uid(),'attendance','edit') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY att_delete ON public.attendance_records FOR DELETE
  USING (public.has_permission(auth.uid(),'attendance','delete') AND public.user_has_branch(auth.uid(), branch_id));

-- customers (shared across branches but gated by feature permission)
CREATE POLICY cust_select ON public.customers FOR SELECT
  USING (public.has_permission(auth.uid(),'customers','view'));
CREATE POLICY cust_insert ON public.customers FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(),'customers','edit'));
CREATE POLICY cust_update ON public.customers FOR UPDATE
  USING (public.has_permission(auth.uid(),'customers','edit'));
CREATE POLICY cust_delete ON public.customers FOR DELETE
  USING (public.has_permission(auth.uid(),'customers','delete'));

-- bookings
CREATE POLICY bk_select ON public.bookings FOR SELECT
  USING (public.has_permission(auth.uid(),'bookings','view') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY bk_insert ON public.bookings FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(),'bookings','edit') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY bk_update ON public.bookings FOR UPDATE
  USING (public.has_permission(auth.uid(),'bookings','edit') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY bk_delete ON public.bookings FOR DELETE
  USING (public.has_permission(auth.uid(),'bookings','delete') AND public.user_has_branch(auth.uid(), branch_id));

CREATE POLICY bsh_select ON public.booking_status_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND public.user_has_branch(auth.uid(), b.branch_id)));
CREATE POLICY bsh_insert ON public.booking_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- payments
CREATE POLICY pay_select ON public.payments FOR SELECT
  USING (public.has_permission(auth.uid(),'payments','view') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY pay_insert ON public.payments FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(),'payments','edit') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY pay_update ON public.payments FOR UPDATE
  USING (public.has_permission(auth.uid(),'payments','edit') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY pay_delete ON public.payments FOR DELETE
  USING (public.has_permission(auth.uid(),'payments','delete') AND public.user_has_branch(auth.uid(), branch_id));

-- commissions
CREATE POLICY com_select ON public.commissions FOR SELECT
  USING (public.has_permission(auth.uid(),'payments','view') AND public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY com_insert ON public.commissions FOR INSERT
  WITH CHECK (public.has_permission(auth.uid(),'payments','edit') AND public.user_has_branch(auth.uid(), branch_id));

-- audit_logs (read-only)
CREATE POLICY audit_select ON public.audit_logs FOR SELECT
  USING (public.is_owner(auth.uid())
         OR (public.has_permission(auth.uid(),'audit_log','view')
             AND (branch_id IS NULL OR public.user_has_branch(auth.uid(), branch_id))));

-- memberships (V2)
CREATE POLICY mp_select ON public.membership_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY mp_owner_modify ON public.membership_plans FOR ALL
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY cm_select ON public.customer_memberships FOR SELECT USING (public.has_permission(auth.uid(),'customers','view'));
CREATE POLICY cm_modify ON public.customer_memberships FOR ALL
  USING (public.has_permission(auth.uid(),'customers','edit'))
  WITH CHECK (public.has_permission(auth.uid(),'customers','edit'));

-- ============== BOOKING CONFLICT FUNCTION ==============
CREATE OR REPLACE FUNCTION public.check_booking_conflicts(
  _therapist_id UUID, _start TIMESTAMPTZ, _end TIMESTAMPTZ, _exclude_id UUID DEFAULT NULL
) RETURNS TABLE(reason TEXT, detail TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d INT := EXTRACT(DOW FROM _start);
  s_start TIME := _start::TIME;
  s_end TIME := _end::TIME;
  sched RECORD;
  att RECORD;
BEGIN
  -- double booking
  IF EXISTS (SELECT 1 FROM public.bookings
             WHERE therapist_id = _therapist_id
               AND is_deleted = false
               AND status NOT IN ('cancelled','no_show')
               AND (_exclude_id IS NULL OR id <> _exclude_id)
               AND tstzrange(start_time, end_time, '[)') && tstzrange(_start, _end, '[)')) THEN
    RETURN QUERY SELECT 'double_booking', 'Therapist already has a booking in this time window';
  END IF;

  SELECT * INTO sched FROM public.therapist_schedules WHERE therapist_id = _therapist_id AND day_of_week = d;
  IF NOT FOUND OR sched.is_off THEN
    RETURN QUERY SELECT 'off_duty', 'Therapist is off duty on this day';
  ELSE
    IF s_start < sched.start_time OR s_end > sched.end_time THEN
      RETURN QUERY SELECT 'outside_schedule', 'Booking is outside therapist working hours';
    END IF;
    IF sched.break_start IS NOT NULL AND sched.break_end IS NOT NULL
       AND s_start < sched.break_end AND s_end > sched.break_start THEN
      RETURN QUERY SELECT 'on_break', 'Booking overlaps therapist break time';
    END IF;
  END IF;

  SELECT * INTO att FROM public.attendance_records
   WHERE therapist_id = _therapist_id AND date = _start::DATE;
  IF FOUND AND att.status IN ('absent','leave','off_duty') THEN
    RETURN QUERY SELECT 'absent', 'Therapist marked '||att.status::TEXT||' today';
  END IF;
END; $$;
