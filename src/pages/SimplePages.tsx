import GenericList from "@/components/GenericList";
import { fmtDate, fmtMoney } from "@/lib/format";

// Re-export rich pages so existing routes keep working
export { default as TherapistQueue } from "./TherapistQueue";
export { default as TherapistSchedulePage } from "./TherapistSchedulePage";
export { default as Attendance } from "./Attendance";
export { default as Customers } from "./Customers";
export { default as Services } from "./Services";
export { default as Settings } from "./Settings";
export { default as AuditLog } from "./AuditLogPage";

export function Therapists() {
  return <GenericList title="Therapists" description="Therapist records." table="therapists" extraSelect="branches(name)" columns={[
    { key: "full_name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "branches.name", label: "Branch" },
    { key: "commission_rate", label: "Commission %", render: (v) => `${v}%` },
    { key: "employment_status", label: "Status", status: true },
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
