import GenericList from "@/components/GenericList";
import { fmtDate, fmtMoney, fmtTime } from "@/lib/format";

export function TherapistQueue() {
  return <GenericList title="Therapist Queue" description="Live therapist availability and recommended lineup." table="therapists" branchScoped={true} extraSelect="" columns={[
    { key: "full_name", label: "Therapist" },
    { key: "employment_status", label: "Status", status: true },
    { key: "commission_rate", label: "Commission %", render: (v) => `${v}%` },
  ]} />;
}

export function TherapistSchedulePage() {
  return <GenericList title="Therapist Schedule" description="Weekly recurring schedules. Edit support coming soon." table="therapist_schedules" branchScoped={false} extraSelect="therapists(full_name)" columns={[
    { key: "therapists.full_name", label: "Therapist" },
    { key: "day_of_week", label: "Day", render: (v) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][v] },
    { key: "start_time", label: "Start" },
    { key: "end_time", label: "End" },
    { key: "is_off", label: "Off?", render: (v) => v ? "Yes" : "—" },
  ]} />;
}

export function Attendance() {
  return <GenericList title="Attendance" description="Daily therapist attendance roster." table="attendance_records" extraSelect="therapists(full_name), branches(name)" columns={[
    { key: "date", label: "Date", render: (v) => fmtDate(v) },
    { key: "therapists.full_name", label: "Therapist" },
    { key: "branches.name", label: "Branch" },
    { key: "status", label: "Status", status: true },
    { key: "clock_in", label: "Clock in", render: (v) => v ? fmtTime(v) : "—" },
    { key: "clock_out", label: "Clock out", render: (v) => v ? fmtTime(v) : "—" },
    { key: "late_minutes", label: "Late (m)" },
  ]} />;
}

export function Customers() {
  return <GenericList title="Customers" description="Customer records." table="customers" branchScoped={false} columns={[
    { key: "full_name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "allergies", label: "Allergies" },
    { key: "last_visit_date", label: "Last visit", render: (v) => v ? fmtDate(v) : "—" },
  ]} />;
}

export function Therapists() {
  return <GenericList title="Therapists" description="Therapist records." table="therapists" extraSelect="branches(name)" columns={[
    { key: "full_name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "branches.name", label: "Branch" },
    { key: "commission_rate", label: "Commission %", render: (v) => `${v}%` },
    { key: "employment_status", label: "Status", status: true },
  ]} />;
}

export function Services() {
  return <GenericList title="Services & Pricing" description="Service catalog. Per-branch pricing managed below." table="services" branchScoped={false} columns={[
    { key: "name", label: "Service" },
    { key: "category", label: "Category" },
    { key: "duration_minutes", label: "Duration (m)" },
    { key: "base_price", label: "Base price", render: (v) => fmtMoney(v) },
    { key: "is_active", label: "Active", render: (v) => v ? "Yes" : "No" },
  ]} />;
}

export function Payments() {
  return <GenericList title="Payments" description="Payment records and commissions." table="payments" extraSelect="customers(full_name), services(name), therapists(full_name), branches(name)" columns={[
    { key: "date_paid", label: "Date", render: (v) => v ? fmtDate(v) : "—" },
    { key: "customers.full_name", label: "Customer" },
    { key: "services.name", label: "Service" },
    { key: "therapists.full_name", label: "Therapist" },
    { key: "branches.name", label: "Branch" },
    { key: "final_amount", label: "Amount", render: (v) => fmtMoney(v) },
    { key: "method", label: "Method" },
    { key: "status", label: "Status", status: true },
  ]} />;
}

export function Reports() {
  return <GenericList title="Reports" description="Sales and performance reports across branches." table="payments" extraSelect="branches(name)" columns={[
    { key: "date_paid", label: "Date", render: (v) => v ? fmtDate(v) : "—" },
    { key: "branches.name", label: "Branch" },
    { key: "final_amount", label: "Amount", render: (v) => fmtMoney(v) },
    { key: "status", label: "Status", status: true },
  ]} />;
}

export function AdminManagement() {
  return <GenericList title="Admin Management" description="Manage admin accounts, branch assignments and feature permissions." table="admin_permissions" branchScoped={false} columns={[
    { key: "user_id", label: "User ID" },
    { key: "feature", label: "Feature" },
    { key: "can_view", label: "View", render: (v) => v ? "✓" : "—" },
    { key: "can_edit", label: "Edit", render: (v) => v ? "✓" : "—" },
    { key: "can_delete", label: "Delete", render: (v) => v ? "✓" : "—" },
  ]} />;
}

export function BranchManagement() {
  return <GenericList title="Branch Management" description="Spa branches." table="branches" branchScoped={false} columns={[
    { key: "name", label: "Name" },
    { key: "address", label: "Address" },
    { key: "contact_number", label: "Contact" },
    { key: "opening_time", label: "Open" },
    { key: "closing_time", label: "Close" },
    { key: "is_active", label: "Active", render: (v) => v ? "Yes" : "No" },
  ]} />;
}

export function AuditLog() {
  return <GenericList title="Audit Log" description="Read-only log of all data changes." table="audit_logs" branchScoped={true} columns={[
    { key: "created_at", label: "When", render: (v) => new Date(v).toLocaleString() },
    { key: "user_name", label: "User" },
    { key: "user_role", label: "Role" },
    { key: "action_type", label: "Action" },
    { key: "entity", label: "Entity" },
  ]} />;
}

export function Settings() {
  return <div><div className="mb-6"><h1 className="text-2xl font-semibold">Settings</h1><p className="text-sm text-muted-foreground mt-1">Business and account settings.</p></div>
    <div className="rounded-lg border p-6 bg-card">
      <h3 className="font-medium">Memberships</h3>
      <p className="text-sm text-muted-foreground mt-1">Tiered prepaid packages — coming in Version 2.</p>
    </div>
    <div className="rounded-lg border p-6 bg-card mt-4">
      <h3 className="font-medium">Notifications</h3>
      <p className="text-sm text-muted-foreground mt-1">Automated reminders via Messenger / SMS / Email — coming in Version 2.</p>
    </div>
  </div>;
}
