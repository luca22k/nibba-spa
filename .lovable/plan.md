# V1 Revision Plan

Targeted updates to the existing app — no rebuild. Keep current schema/auth/RLS/design and only add or change what's listed.

## 0. Fix outstanding build error & routing

- `src/components/booking/BookingForm.tsx`: the `PHAddressFields` `onChange` expects `PHAddress` (with optional fields) but it's wired to a `setState` whose state has all-required strings. Fix by typing the local address state as `PHAddress` (or wrap in `(next) => setAddress({ region: '', province: '', city: '', barangay: '', line1: '', line2: '', ...next })`).
- `src/App.tsx`: route `/queue` and `/schedule` to the dedicated `TherapistQueue` and `TherapistSchedulePage` files (currently re-exported via `SimplePages`). Verify `Customers`, `Attendance`, `Services`, `Settings`, `AuditLog` pages route to their dedicated files, not stubs.

## 1. Shared therapist recommendation engine

Create `src/lib/recommendation.ts` exporting a single ranking function used by **both** Booking form lineup and Therapist Queue. Replaces ad-hoc logic in `src/lib/lineup.ts` (kept as thin wrapper).

Inputs: therapists + their schedules/skills/attendance/today's bookings + payments (yesterday/range) + branch + service + booking time + isHomeService.

Modes (`recommendBy`):
- **Performance** — sort by sales/commission in selected range. Sort: High→Low / Low→High.
- **Rotation Fairness** — uses next-available time, last-finished time, return-to-base ETA (Home Service), today's count. Sort: `Next Available First` (default), `Longest Waiting First`, `Earliest Return First` (HS only, default for HS bookings).
- **Attendance** — score from attendance_records over date range (Yesterday / This week / All time / Custom). Sort: High→Low / Low→High.
- **Time Availability** — next free slot today. Sort: `Earliest Available First`, `Latest Available First`, `Available Now First`.
- **Current Booking Load** — count of today's active bookings per therapist. Sort: High→Low / Low→High.

Always filters: must have skill for service, must be clocked-in & not absent/leave/off, no schedule conflicts, branch match.

Returns ranked list with reason text + score breakdown for tooltip.

## 2. Bookings page (`src/pages/Bookings.tsx`)

- Remove top filter "type" buttons.
- Replace single-select filter row with **multi-select checkbox dropdowns** in the table header for: Branch, Status, Therapist, Service, Payment Status, Payment Method, Booking Type, Add-ons, Room/Home Service. New component `MultiSelectFilter.tsx` (popover + checkbox list + "Clear" + chip count).
- Columns:
  - Split combined date/time → **Date** column + **Time** column.
  - New **Add-ons** column showing comma-separated add-on names from `booking_addons` join, or `None`.
- Booking form (`BookingForm.tsx`): add **N/A** option in Preferred Therapist (select stores `null`, label "N/A"). Same change in Customer create dialog.
- Therapist lineup panel inside the form: integrate the shared recommendation engine with the new "Recommend based on" + dynamic "Sorting order" controls, plus attendance-range selector when applicable. Default `Rotation Fairness → Earliest Return First` for Home Service, else `Next Available First`.

## 3. Therapist Queue (`src/pages/TherapistQueue.tsx`)

- Recommended Lineup panel uses the same `RecommendationControls` component and shared engine — identical behavior to the Booking form.
- Existing cards/list stay; only the lineup recommendation section is upgraded.

## 4. Therapist Schedule (`src/pages/TherapistSchedulePage.tsx`)

- Rename weekly columns to: **Shift Start, Shift End, Lunch/Break Start, Lunch/Break End**.
- Per-day **Has scheduled break** checkbox. Unchecked → break fields disabled and saved as `NULL` for `break_start`/`break_end`.
- **Copy schedule** controls:
  - "Copy Monday to all weekdays"
  - "Copy <day> to selected days" (multi-select day picker)
  - "Apply same schedule to all working days"
  - Skips days marked Off Day unless explicitly selected.

## 5. Attendance (`src/pages/Attendance.tsx`)

- Clock In / Clock Out button state: when `clock_in IS NOT NULL AND clock_out IS NULL` → Clock In disabled, Clock Out enabled. When both set → both disabled (no further action). Prevent duplicate writes with optimistic disable + server check on `attendance_records` row.
- New **Request Correction** action per row → opens dialog with: Therapist (locked), Branch (locked), Field to correct (clock_in / clock_out / status), Current Value (locked), Requested Value (datetime/select), Reason (required note).
- Submission inserts into new `attendance_corrections` table with status `pending_owner_review`.

## 6. Owner notifications & correction approval flow

New table `notifications` (recipient = owner) and a new top-bar **bell icon** in `AppLayout.tsx` showing unread count.

- On correction submit → trigger inserts a `notifications` row for every owner.
- Clicking the bell opens a list; clicking an item routes to `/attendance/corrections` (new page).
- New page **`AttendanceCorrections.tsx`** lists pending requests with Approve / Reject buttons + reason field on reject.
  - **Approve**: updates `attendance_records` with requested value; sets correction status `approved`; writes audit log.
  - **Reject**: status `rejected`; writes audit log; no change to attendance.
- Both actions create a notification back to the submitting Admin.

## 7. Branch Management (`/branches`)

Replace the stub. Owner-only full CRUD UI:

- List branches with status toggle (active/deactivate via `is_active`).
- Edit dialog: name, address, contact_number, opening_time, closing_time.
- Tabs inside branch detail drawer:
  - **Admins**: assign/remove via `branch_admins`.
  - **Therapists**: assign/remove (set/clear `therapists.branch_id`).
  - **Rooms**: add/edit/deactivate, with `notes`.
- Admin access gated by `has_permission('branches','edit')`; default Admins get view-only.

## 8. Audit Log expansion

Attach `write_audit` triggers to: `attendance_records`, `attendance_corrections`, `branches`, `branch_admins`, `rooms`, `therapists` (assignment changes), `notifications` (insert only). Friendly action labels in `AuditLogPage.tsx` for: clock_in, clock_out, manual_attendance_change, correction_submitted, correction_approved, correction_rejected, branch_updated, room_updated, admin_assigned, admin_removed, therapist_assigned, therapist_removed.

## 9. Database migration

```text
attendance_corrections
  id uuid pk
  therapist_id uuid not null
  branch_id uuid not null
  attendance_id uuid not null
  field text check in ('clock_in','clock_out','status')
  current_value text
  requested_value text
  reason text not null
  status enum(pending_owner_review|approved|rejected) default pending_owner_review
  submitted_by uuid not null
  reviewed_by uuid
  reviewed_at timestamptz
  reviewer_note text
  created_at, updated_at

notifications
  id uuid pk
  recipient_id uuid not null  -- specific user
  type text                    -- 'attendance_correction', etc.
  title text
  body text
  link text                    -- e.g. /attendance/corrections
  related_entity text
  related_id uuid
  is_read bool default false
  created_at
```

RLS:
- `attendance_corrections`: insert if `has_permission('attendance','edit')` and branch match; select if owner OR submitter OR branch match; update only by owner.
- `notifications`: select/update where `recipient_id = auth.uid()`; insert via SECURITY DEFINER trigger only.

Triggers:
- After insert on `attendance_corrections` → insert `notifications` for each owner (`user_roles.role='owner'`).
- After update of `status` to `approved` → update target `attendance_records` row using `field` + `requested_value`; insert audit row; insert notification to `submitted_by`.
- Extend `write_audit` triggers on the tables in §8.

Realtime: enable for `notifications` and `attendance_corrections`.

No data destruction; existing rows untouched.

## 10. Out of scope

Auth, role model, design tokens, payments/commission math, seed data structure (only minor inserts if needed).

## Files to add / change

- New: `src/lib/recommendation.ts`, `src/components/booking/RecommendationControls.tsx`, `src/components/MultiSelectFilter.tsx`, `src/components/NotificationBell.tsx`, `src/pages/AttendanceCorrections.tsx`, `src/pages/BranchManagement.tsx`, migration SQL.
- Edit: `src/App.tsx`, `src/components/AppLayout.tsx`, `src/components/booking/BookingForm.tsx`, `src/components/booking/TherapistLineupPanel.tsx`, `src/pages/Bookings.tsx`, `src/pages/TherapistQueue.tsx`, `src/pages/TherapistSchedulePage.tsx`, `src/pages/Attendance.tsx`, `src/pages/AuditLogPage.tsx`, `src/pages/SimplePages.tsx` (drop now-replaced exports), `src/lib/lineup.ts` (delegate to new engine).