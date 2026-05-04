import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { fmtDate, fmtMoney, fmtTime } from "@/lib/format";
import { BookingForm } from "@/components/booking/BookingForm";

const STATUSES = ["confirmed","in_progress","completed","cancelled","no_show"];
const PAY_STATUSES = ["unpaid","partially_paid","paid","refunded","cancelled"];
const TYPES = ["walk_in","phone","online","repeat"];

export default function Bookings() {
  const { can } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const branchFilter = selectedBranchId === "all" ? null : selectedBranchId;

  const [rows, setRows] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const reload = async () => {
    let q = supabase
      .from("bookings")
      .select("*, customers(full_name,phone), therapists(full_name), services(name), branches(name), rooms(name)")
      .eq("is_deleted", false)
      .order("start_time", { ascending: false })
      .limit(300);
    if (branchFilter) q = q.eq("branch_id", branchFilter);
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    if (payFilter !== "all") q = q.eq("payment_status", payFilter as any);
    if (typeFilter !== "all") q = q.eq("booking_type", typeFilter as any);
    if (therapistFilter !== "all") q = q.eq("therapist_id", therapistFilter);
    if (serviceFilter !== "all") q = q.eq("service_id", serviceFilter);
    if (roomFilter !== "all") q = q.eq("room_id", roomFilter);
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => {
    (async () => {
      const [t, s, r] = await Promise.all([
        supabase.from("therapists").select("id,full_name,branch_id").eq("is_deleted", false),
        supabase.from("services").select("id,name").eq("is_deleted", false),
        supabase.from("rooms").select("id,name,branch_id").eq("is_deleted", false),
      ]);
      setTherapists(t.data ?? []); setServices(s.data ?? []); setRooms(r.data ?? []);
    })();
  }, []);

  useEffect(() => { reload(); }, [branchFilter, statusFilter, payFilter, typeFilter, therapistFilter, serviceFilter, roomFilter]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.customers?.full_name?.toLowerCase().includes(q) ||
      r.customers?.phone?.includes(q) ||
      r.therapists?.full_name?.toLowerCase().includes(q) ||
      r.services?.name?.toLowerCase().includes(q)
    );
  }), [rows, search]);

  const branchTherapists = branchFilter ? therapists.filter((t) => t.branch_id === branchFilter) : therapists;
  const branchRooms = branchFilter ? rooms.filter((r) => r.branch_id === branchFilter) : rooms;

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Manage spa bookings across branches."
        actions={can("bookings","edit") && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New booking</Button>}
      />

      <Card className="p-4 mb-4 grid gap-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customer, therapist, service..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="Status" options={STATUSES} />
        <FilterSelect value={payFilter} onChange={setPayFilter} placeholder="Payment" options={PAY_STATUSES} />
        <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="Type" options={TYPES} />
        <FilterSelect value={therapistFilter} onChange={setTherapistFilter} placeholder="Therapist"
          options={branchTherapists.map((t) => ({ value: t.id, label: t.full_name }))} />
        <FilterSelect value={serviceFilter} onChange={setServiceFilter} placeholder="Service"
          options={services.map((s) => ({ value: s.id, label: s.name }))} />
        <FilterSelect value={roomFilter} onChange={setRoomFilter} placeholder="Room"
          options={branchRooms.map((r) => ({ value: r.id, label: r.name }))} />
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date / Time</TableHead><TableHead>Customer</TableHead><TableHead>Service</TableHead>
              <TableHead>Therapist</TableHead><TableHead>Branch</TableHead><TableHead>Total</TableHead>
              <TableHead>Status</TableHead><TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">No bookings found</TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="text-sm">{fmtDate(r.booking_date)}</div>
                  <div className="text-xs text-muted-foreground">{fmtTime(r.start_time)} – {fmtTime(r.end_time)}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{r.customers?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.customers?.phone}</div>
                </TableCell>
                <TableCell>{r.services?.name}{r.is_home_service && <span className="ml-1 text-xs text-muted-foreground">(Home)</span>}</TableCell>
                <TableCell>{r.therapists?.full_name ?? "—"}</TableCell>
                <TableCell className="text-sm">{r.branches?.name}</TableCell>
                <TableCell>{fmtMoney(r.total_amount)}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell><StatusBadge status={r.payment_status} /></TableCell>
                <TableCell className="text-right">
                  {can("bookings","edit") && (
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {open && (
        <BookingForm
          open={open}
          onClose={() => setOpen(false)}
          existing={editing}
          branches={branches}
          defaultBranchId={branchFilter ?? branches[0]?.id}
          onSaved={() => { setOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

function FilterSelect({
  value, onChange, placeholder, options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder.toLowerCase()}</SelectItem>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o.replace(/_/g, " ") : o.label;
          return <SelectItem key={v} value={v}>{l}</SelectItem>;
        })}
      </SelectContent>
    </Select>
  );
}
