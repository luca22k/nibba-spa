# Spa Management System — V1 MVP

A clean, light SaaS-style internal admin app for a multi-branch massage spa, with Owner/Admin roles, full booking + therapist queue logic, and seeded demo data so flows are testable immediately.

## Backend (Lovable Cloud)

### Auth

- Email/password sign-in (no public signup — Owner creates Admin accounts).
- One bootstrap Owner account created via seed.
- `profiles` table linked to `auth.users` (full name, phone, active flag).

### Roles & permissions (separate tables, security-definer functions)

- `app_role` enum: `owner`, `admin`.
- `user_roles` (user_id, role).
- `admin_permissions` (user_id, feature, can_view, can_edit, can_delete) covering: bookings, customers, therapists, attendance, payments, reports, services_pricing, audit_log.
- `branch_admins` (user_id, branch_id) for branch assignment.
- `has_role()` and `has_permission()` SECURITY DEFINER functions used by all RLS policies.

### Core schema

profiles, branches, rooms, services, service_branch_pricing, therapists, therapist_skills, therapist_schedules (weekly recurring), attendance_records, customers, bookings, booking_status_history, payments, commissions, audit_logs, membership_plans (placeholder), customer_memberships (placeholder).

Standard fields on all main tables: `created_at`, `updated_at`, `is_deleted`, `deleted_at`, `deleted_by`.

### RLS

- Owner: full access everywhere.
- Admin: only rows where `branch_id` is in their `branch_admins`, and only features enabled in `admin_permissions`. Audit logs read-only and never deletable from the app.

### Triggers / functions

- Auto-create profile on signup.
- Audit-log trigger on bookings, payments, services, service_branch_pricing, admin_permissions, branches → writes old/new values, user, role, branch.
- Soft-delete helper.
- Booking conflict check function (therapist double-booking, schedule, attendance) used by both UI and DB.
- Recommended-lineup ranking function (yesterday sales, yesterday absence, today's load, rotation, skill match, attendance).

## Frontend

Stack: existing React + Vite + Tailwind + shadcn. Light SaaS look using design tokens in `index.css` (neutral surfaces, blue primary). Desktop-first.

### App shell

- `SidebarProvider` layout with collapsible icon sidebar.
- Top bar: branch selector (Owner sees all + "All branches"; Admin sees only assigned), user menu, sign out.
- Sidebar items hidden based on role + permissions:
Dashboard, Bookings, Therapist Queue, Therapist Schedule, Attendance, Customers, Therapists, Services & Pricing, Payments, Reports, Admin Management, Branch Management, Audit Log, Settings.

### Pages

**Auth**: `/login`, `/reset-password`.

**Dashboard** (`/`)

- Owner view: total revenue, bookings today, top services, revenue/branch, booking volume/branch, therapist highlights, recent audit activity. Filters: branch, date range, service, therapist, payment method.
- Admin view: today's bookings, Gantt schedule preview, queue, recommended lineup, attendance status, today's revenue, pending payments, upcoming bookings.

**Bookings** (`/bookings`)

- Table with filters (status, branch, date, therapist, service, payment status), search.
- Create/edit dialog with all fields from spec, statuses (Pending/Confirmed/In Progress/Completed/Cancelled/No-show), booking types (walk-in/phone/online/repeat).
- Room/service location selector should include both branch rooms and a **Home Service** option.
- If **Home Service** is selected, the booking should not require a physical room assignment, but should require the customer’s service address and any home service notes/instructions.
- Customer picker with duplicate detection (phone + name fuzzy match) and inline "create new customer".
- Therapist conflict warning modal listing every conflict reason; explicit override required to proceed.

**Therapist Queue** (`/queue`)

- Tabs: Live Queue, Recommended Lineup, Performance Ranking.
- Status badges: Available / Booked / On break / Off duty / Absent.
- Filters: branch, service, availability, attendance, date range.

**Therapist Schedule** (`/schedule`)

- Day Gantt timeline (rows = therapists, columns = time). Shows bookings, breaks, off-duty, absences, room.
- Weekly schedule editor per therapist (working days, start/end, break, skills, branch).

**Attendance** (`/attendance`)

- Daily roster: clock in/out, present/absent, late/undertime/overtime, leave.
- Drives queue availability live.

**Customers** (`/customers`) — list + profile with booking & payment history, allergies, preferred therapist; duplicate detection.

**Therapists** (`/therapists`) — records with skills, branch, commission rate, schedule, attendance/booking/sales/commission history.

**Services & Pricing** (`/services`)

- Categories: massage, package, add-on, home service.
- Per-branch price overrides table.
- Edit gated to Owner (or Admin with explicit `services_pricing` edit permission).

**Payments** (`/payments`)

- List + create/edit; methods (Cash, Card, GCash, Maya, Bank, Other); statuses; discount + final amount; commission auto-calc on Paid+Completed.

**Reports** (`/reports`)

- Sales (daily/weekly/monthly), branch, therapist, service, commission, booking volume, attendance. Charts (recharts) + summary cards. Filters as in spec. Admin scoped to their branches.

**Admin Management** (`/admins`) — Owner only. Create/edit Admin, assign branches, toggle per-feature permissions, activate/deactivate, view recent activity.

**Branch Management** (`/branches`) — Owner only. CRUD branches, hours, rooms, assigned admins/therapists, soft-delete.

**Audit Log** (`/audit`) — read-only table with filters; Admin scoped to their branches.

**Settings** (`/settings`) — business info, profile, password change, "Memberships (coming in V2)" placeholder.

## Seed data

- 1 Owner (`owner@spa.test` / shown after build).
- 2 Admins assigned to different branches.
- 3 branches with rooms and hours.
- ~12 therapists across branches with skills, schedules, mixed attendance today.
- 8 services with per-branch pricing.
- ~25 customers, ~40 bookings spanning yesterday/today/tomorrow with varied statuses.
- Payments + commissions for completed bookings.
- Audit log entries from the seed activity.

## Out of scope (V2 placeholders only)

Memberships UI, automated reminders (Messenger/SMS/Email), separate therapist app.

## Technical notes

- RLS policies always go through SECURITY DEFINER helpers — never reference `user_roles` directly in policies on other tables.
- Booking conflict + recommended-lineup logic lives in DB functions so it stays consistent across UI surfaces.
- Soft-delete enforced via `is_deleted = false` filter in every query and policy.
- Audit log table has no UPDATE/DELETE policies (insert-only via trigger).
- Forms validated with `zod` + react-hook-form.
- Charts via existing `recharts` integration in shadcn `chart` component.

After approval I'll implement the schema + RLS, seed data, then build the UI page by page in the order of the V1 priority list.