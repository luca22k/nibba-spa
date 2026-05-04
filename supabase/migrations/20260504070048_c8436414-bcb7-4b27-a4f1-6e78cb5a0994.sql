
-- ====== ENUM: drop "pending" from booking_status ======
UPDATE public.bookings SET status = 'confirmed' WHERE status = 'pending';
ALTER TYPE public.booking_status RENAME TO booking_status_old;
CREATE TYPE public.booking_status AS ENUM ('confirmed','in_progress','completed','cancelled','no_show');
ALTER TABLE public.bookings
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.booking_status USING status::text::public.booking_status,
  ALTER COLUMN status SET DEFAULT 'confirmed'::public.booking_status;
ALTER TABLE public.booking_status_history
  ALTER COLUMN from_status TYPE public.booking_status USING from_status::text::public.booking_status,
  ALTER COLUMN to_status   TYPE public.booking_status USING to_status::text::public.booking_status;
DROP TYPE public.booking_status_old;

-- ====== bookings: new columns ======
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address_region text,
  ADD COLUMN IF NOT EXISTS address_province text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_barangay text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text;

-- ====== customers: new columns ======
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS has_allergy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_override_note text;

-- ====== rooms: notes column ======
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS notes text;

-- ====== service_durations ======
CREATE TABLE IF NOT EXISTS public.service_durations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  duration_minutes integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, duration_minutes)
);
ALTER TABLE public.service_durations ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_select ON public.service_durations FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.has_permission(auth.uid(),'services_pricing','view'));
CREATE POLICY sd_modify ON public.service_durations FOR ALL
  USING (public.has_permission(auth.uid(),'services_pricing','edit'))
  WITH CHECK (public.has_permission(auth.uid(),'services_pricing','edit'));
CREATE TRIGGER trg_sd_updated BEFORE UPDATE ON public.service_durations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ====== service_addons ======
CREATE TABLE IF NOT EXISTS public.service_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY sa_select ON public.service_addons FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.has_permission(auth.uid(),'services_pricing','view'));
CREATE POLICY sa_modify ON public.service_addons FOR ALL
  USING (public.has_permission(auth.uid(),'services_pricing','edit'))
  WITH CHECK (public.has_permission(auth.uid(),'services_pricing','edit'));
CREATE TRIGGER trg_sa_updated BEFORE UPDATE ON public.service_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ====== booking_addons ======
CREATE TABLE IF NOT EXISTS public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  addon_id uuid NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_addons_booking ON public.booking_addons(booking_id);
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY ba_select ON public.booking_addons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = booking_addons.booking_id
      AND public.has_permission(auth.uid(),'bookings','view')
      AND public.user_has_branch(auth.uid(), b.branch_id)));
CREATE POLICY ba_modify ON public.booking_addons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = booking_addons.booking_id
      AND public.has_permission(auth.uid(),'bookings','edit')
      AND public.user_has_branch(auth.uid(), b.branch_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = booking_addons.booking_id
      AND public.has_permission(auth.uid(),'bookings','edit')
      AND public.user_has_branch(auth.uid(), b.branch_id)));

-- ====== Philippine address tables ======
CREATE TABLE IF NOT EXISTS public.ph_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ph_provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.ph_regions(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ph_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id uuid NOT NULL REFERENCES public.ph_provinces(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ph_barangays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.ph_cities(id) ON DELETE CASCADE,
  name text NOT NULL
);
ALTER TABLE public.ph_regions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_cities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_barangays ENABLE ROW LEVEL SECURITY;
CREATE POLICY ph_r_sel ON public.ph_regions   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY ph_p_sel ON public.ph_provinces FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY ph_c_sel ON public.ph_cities    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY ph_b_sel ON public.ph_barangays FOR SELECT USING (auth.uid() IS NOT NULL);

-- ====== Audit triggers (idempotent) ======
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'bookings','customers','payments','services','service_branch_pricing',
    'service_durations','service_addons','rooms','attendance_records',
    'therapist_schedules','therapist_skills','therapists','admin_permissions','branches'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_audit();',
      t, t);
  END LOOP;
END$$;

-- ====== updated_at triggers for tables that lacked one ======
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'bookings','customers','payments','services','service_branch_pricing',
    'rooms','attendance_records','therapist_schedules','therapists',
    'admin_permissions','branches'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_%I ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_updated_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();',
      t, t);
  END LOOP;
END$$;

-- ====== Realtime ======
ALTER TABLE public.bookings            REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records  REPLICA IDENTITY FULL;
ALTER TABLE public.therapist_schedules REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.therapist_schedules;
