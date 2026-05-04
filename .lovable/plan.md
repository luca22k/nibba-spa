# V1 MVP Fix & Update Plan

Focused updates on the existing app — keep current schema, auth, RBAC, and design. Only add/modify what the spec requires.

## 1. Database Schema Changes (migration)

New columns / tables:
- `services.duration_options` removed-fixed → add table **`service_durations`** (`id`, `service_id`, `duration_minutes`, `price`, `is_active`).
- New table **`service_addons`** (`id`, `name`, `price`, `is_active`, `description`) — global add-ons (or `branch_id` nullable for future).
- New table **`booking_addons`** (`id`, `booking_id`, `addon_id`, `price`).
- `bookings`: add `duration_minutes`, `total_amount`, structured Home Service address columns: `address_region`, `address_province`, `address_city`, `address_barangay`, `address_line1`, `address_line2`.
- `customers`: add `has_allergy boolean default false`, `duplicate_override_note text`.
- New tables for PH address seed: **`ph_regions`**, **`ph_provinces`**, **`ph_cities`**, **`ph_barangays`** with parent FKs. Seed sample (NCR + 2 provinces, ~5 cities, ~10 barangays each) — design supports full dataset import later.
- `rooms`: already has `name`, `branch_id`, `is_active`. Add `notes text`.
- Update `booking_status` enum: drop `pending`. Migration: update existing `pending` rows to `confirmed`, then `ALTER TYPE` rebuild without `pending`.
- Triggers/audit: extend `write_audit` triggers to cover new tables (`rooms`, `service_durations`, `service_addons`, `customers`, `attendance_records`, `therapist_schedules`, `admin_permissions`).
- RLS for new tables follows existing patterns (`has_permission` for services_pricing/customers/bookings).

## 2. Dashboard (`src/pages/Dashboard.tsx`)
- Remove Customers metric card.
- Remove Recent Activity section (data now lives only in Audit Log).
- **Top Services** chart: add date-range filter (Today / This week / Past 2 weeks / This month / All time / Custom via shadcn Calendar Popover). Toggle metric: Bookings count vs Revenue.
- **Today's Gantt**: new component `TodayGantt.tsx` showing horizontal time axis (branch open→close), one row per therapist, blocks for bookings (color by status), break overlay, off-duty/absent state, room + service tooltips. Pulls `bookings` + `therapist_schedules` + `attendance_records` for today. Realtime subscribe.
- **Today's Bookings** list: add filter bar (Branch, Therapist, Service, Customer search, Status, Payment status, Room, Booking type).

## 3. Bookings (`src/pages/Bookings.tsx` + new `BookingForm.tsx`)
Refactor the create/edit dialog into a multi-section form:
- **Customer search input** (Combobox): typeahead against `customers` (name/phone fuzzy). Inline "Create new" panel with: full name, mobile (+63 prefix locked, strip leading 0, digits only), email, allergy checkbox + details, preferred therapist, notes. Customer NOT persisted until confirmation modal accepted.
- **Duplicate detection** on inline create: query phone exact + name ILIKE; if matches → show suggestion list and require either selecting existing OR ticking "Create as new" with a required override note (saved to `customers.duplicate_override_note`).
- **Service + Duration**: select service → load `service_durations` → pick duration (price auto-fills).
- **Add-ons**: multi-select chips from `service_addons` where `is_active`. Total = duration price + sum(addons).
- **Therapist Lineup panel**: live ranked list of therapists for selected service+date+time using rules from §3 below; click to assign.
- **Room vs Home Service**: toggle. If Home Service → show structured PH address (Region → Province → City → Barangay dependent dropdowns + line1/2). Else → room dropdown filtered by branch.
- **Status** options: Confirmed, In Progress, Completed, Cancelled, No-show.
- **Required-field validation** before opening confirmation.
- **Confirmation Modal**: summary of all fields + Total. Only on Confirm: insert/update customer, insert booking + booking_addons, write audit.

## 4. Therapist Queue (`src/pages/TherapistQueue.tsx` — replace stub)
Visual lineup view:
- Cards per therapist showing avatar/initials, status badge (available/booked/break/off/absent), today's booking count, yesterday's commission, next-free-time, rank #.
- Bar chart (recharts) of sales/commission yesterday.
- Availability mini-timeline strip for today.
- **Filters**: Branch, Service, Availability, Attendance status, Date range.
- **"Recommend lineup based on"**: Performance / Attendance / Time Availability / Rotation Fairness / Current Booking Load.
- **Sort order**: High→Low / Low→High.
- Excludes therapists who are absent/clocked-out/off-duty from "recommended" list (still listed but greyed).
- Logic implemented client-side from joined data; reuses helpers shared with Booking lineup.

## 5. Therapist Schedule (`src/pages/TherapistSchedulePage.tsx` — replace stub)
- Day view Gantt (same component as Dashboard, larger). Date picker.
- Side panel to edit weekly schedule per therapist: working days, off days, start/end, break, branch, skills (multi-select services). Saves to `therapist_schedules` and `therapist_skills`.
- Sync: changes immediately reflect in Queue & Dashboard via React Query invalidation + Supabase realtime.

## 6. Attendance (`src/pages/Attendance.tsx` — replace stub)
- Today's roster table per branch: Therapist | Status | Clock-in | Clock-out | Late | Under | Over | Notes | Actions.
- Buttons: Clock In, Clock Out, Mark Present, Mark Absent, Mark Late, Mark Leave.
- Editing updates `attendance_records` (upsert by therapist+date).
- Queue & Schedule subscribe so availability updates in near-real-time.

## 7. Customers (`src/pages/Customers.tsx` — replace stub)
- Add Customer dialog with same fields as inline form (full name, +63 phone, email, preferred therapist, allergy checkbox+details, notes).
- Duplicate prompt with override-note enforcement on save.
- List with search + edit/soft-delete.

## 8. Services & Pricing (`src/pages/Services.tsx` — replace stub)
Owner-only edit (Admins gated by `services_pricing` permission):
- Services CRUD + activate/deactivate.
- Per-service durations editor (rows of duration + price).
- Branch-specific pricing override (existing `service_branch_pricing`) UI.
- Separate **Add-ons** tab: CRUD on `service_addons`.

## 9. Settings (`src/pages/Settings.tsx` — replace stub)
- **Rooms management** (Owner): add/edit/deactivate rooms, assign branch, notes.
- Existing settings retained.

## 10. Audit Log (`src/pages/SimplePages.tsx` AuditLog)
- Surface as the canonical "Recent Activity": friendly action labels, entity name, user, branch, timestamp.
- Filters: entity, action_type, branch, date range, user.
- Confirm new triggers cover: bookings, customers (incl. duplicate override), payments, services, service_durations, service_addons, rooms, attendance_records, therapist_schedules, admin_permissions.

## 11. Seed Updates (`bootstrap-demo` edge function)
- Add `service_durations` rows (30/60/90 variants with prices) for each service.
- Add 4 sample `service_addons` (Ear Candling, Hot Towel, Aroma Upgrade, Scalp Massage).
- Seed sample PH address rows (NCR → Metro Manila → Makati/Taguig/QC → 5 barangays each, plus Cebu and Davao samples).
- Convert any seeded `pending` bookings → `confirmed`.

## Technical Notes
- New shared helpers: `src/lib/lineup.ts` (ranking algorithms), `src/lib/phone.ts` (+63 normalization), `src/lib/address.ts` (PH cascading queries).
- New components: `src/components/booking/BookingForm.tsx`, `BookingConfirmDialog.tsx`, `CustomerCombobox.tsx`, `PhoneInput.tsx`, `PHAddressFields.tsx`, `AddonsSelector.tsx`, `TherapistLineupPanel.tsx`, `TodayGantt.tsx`.
- Realtime: enable `supabase_realtime` for `bookings`, `attendance_records`, `therapist_schedules`.
- Keep existing AuthContext/`can()` & BranchContext as-is.
- All new tables: RLS enabled with policies mirroring nearest existing table.

## Out of scope (preserved as-is)
- Auth flows, role definitions, sidebar shell, design tokens, payments/commissions logic (only minor wire-ups for new total_amount field).
