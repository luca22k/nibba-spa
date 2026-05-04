import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtTime } from "@/lib/format";

const BOOKING_TYPES = ["walk_in","phone","online","repeat"];
const STATUSES = ["pending","confirmed","in_progress","completed","cancelled","no_show"];
const PAYMENT_METHODS = ["cash","card","gcash","maya","bank_transfer","other"];
const PAYMENT_STATUSES = ["unpaid","partially_paid","paid","refunded","cancelled"];

export default function Bookings() {
  const { can } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const branchFilter = selectedBranchId === "all" ? null : selectedBranchId;

  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const reload = async () => {
    let q = supabase.from("bookings").select("*, customers(full_name,phone), therapists(full_name), services(name,duration_minutes), branches(name), rooms(name)").eq("is_deleted", false).order("start_time", { ascending: false }).limit(200);
    if (branchFilter) q = q.eq("branch_id", branchFilter);
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => {
    (async () => {
      const [s, t, c, r] = await Promise.all([
        supabase.from("services").select("id,name,duration_minutes,base_price,category").eq("is_deleted", false),
        supabase.from("therapists").select("id,full_name,branch_id").eq("is_deleted", false),
        supabase.from("customers").select("id,full_name,phone").eq("is_deleted", false).limit(500),
        supabase.from("rooms").select("id,name,branch_id").eq("is_deleted", false),
      ]);
      setServices(s.data ?? []); setTherapists(t.data ?? []); setCustomers(c.data ?? []); setRooms(r.data ?? []);
    })();
  }, []);

  useEffect(() => { reload(); }, [branchFilter, statusFilter]);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.customers?.full_name?.toLowerCase().includes(q) || r.therapists?.full_name?.toLowerCase().includes(q) || r.services?.name?.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Manage spa bookings across branches."
        actions={can("bookings","edit") && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New booking</Button>}
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customer, therapist, service..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead><TableHead>Customer</TableHead><TableHead>Service</TableHead>
              <TableHead>Therapist</TableHead><TableHead>Branch</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No bookings found</TableCell></TableRow>}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell><div className="text-sm">{fmtDate(r.booking_date)}</div><div className="text-xs text-muted-foreground">{fmtTime(r.start_time)} – {fmtTime(r.end_time)}</div></TableCell>
                <TableCell><div className="text-sm">{r.customers?.full_name ?? "—"}</div><div className="text-xs text-muted-foreground">{r.customers?.phone}</div></TableCell>
                <TableCell>{r.services?.name}{r.is_home_service && <span className="ml-1 text-xs text-muted-foreground">(Home)</span>}</TableCell>
                <TableCell>{r.therapists?.full_name ?? "—"}</TableCell>
                <TableCell className="text-sm">{r.branches?.name}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell><StatusBadge status={r.payment_status} /></TableCell>
                <TableCell className="text-right">
                  {can("bookings","edit") && <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {open && (
        <BookingDialog
          open={open}
          onClose={() => setOpen(false)}
          existing={editing}
          services={services}
          therapists={therapists}
          customers={customers}
          rooms={rooms}
          branches={branches}
          defaultBranchId={branchFilter ?? branches[0]?.id}
          onSaved={() => { setOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

function BookingDialog({ open, onClose, existing, services, therapists, customers, rooms, branches, defaultBranchId, onSaved }: any) {
  const [form, setForm] = useState<any>(() => existing ?? {
    booking_type: "walk_in",
    branch_id: defaultBranchId,
    customer_id: "",
    therapist_id: "",
    service_id: "",
    room_id: "",
    booking_date: new Date().toISOString().slice(0,10),
    start_hhmm: "10:00",
    status: "pending",
    payment_status: "unpaid",
    payment_method: "",
    is_home_service: false,
    service_address: "",
    notes: "",
  });
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", email: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [conflicts, setConflicts] = useState<{ reason: string; detail: string }[]>([]);
  const [confirmConflict, setConfirmConflict] = useState(false);
  const [busy, setBusy] = useState(false);

  // when editing, prefill start_hhmm
  useEffect(() => {
    if (existing?.start_time) {
      const d = new Date(existing.start_time);
      setForm((f: any) => ({ ...f, start_hhmm: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` }));
    }
  }, []);

  const dupCustomers = useMemo(() => {
    if (!creatingCustomer) return [];
    const n = newCustomer.full_name.trim().toLowerCase();
    const p = newCustomer.phone.trim();
    if (!n && !p) return [];
    return customers.filter((c: any) => (n && c.full_name?.toLowerCase().includes(n)) || (p && c.phone?.includes(p))).slice(0, 5);
  }, [newCustomer, creatingCustomer, customers]);

  const branchTherapists = therapists.filter((t: any) => !form.branch_id || t.branch_id === form.branch_id);
  const branchRooms = rooms.filter((r: any) => r.branch_id === form.branch_id);
  const service = services.find((s: any) => s.id === form.service_id);

  const computeTimes = () => {
    const [hh, mm] = (form.start_hhmm ?? "10:00").split(":").map(Number);
    const start = new Date(form.booking_date + "T00:00:00");
    start.setHours(hh, mm, 0, 0);
    const dur = service?.duration_minutes ?? 60;
    const end = new Date(start.getTime() + dur * 60000);
    return { start, end };
  };

  const checkConflicts = async () => {
    if (!form.therapist_id) return [];
    const { start, end } = computeTimes();
    const { data } = await supabase.rpc("check_booking_conflicts", {
      _therapist_id: form.therapist_id,
      _start: start.toISOString(),
      _end: end.toISOString(),
      _exclude_id: existing?.id ?? null,
    });
    return (data as any[]) ?? [];
  };

  const submit = async (override = false) => {
    if (!form.branch_id || !form.service_id || !form.start_hhmm) {
      toast.error("Fill in branch, service and start time"); return;
    }
    setBusy(true);
    try {
      let customerId = form.customer_id;
      if (creatingCustomer) {
        if (!newCustomer.full_name) throw new Error("Customer name required");
        const { data: cIns, error: cErr } = await supabase.from("customers").insert({
          full_name: newCustomer.full_name, phone: newCustomer.phone || null, email: newCustomer.email || null,
        }).select().single();
        if (cErr) throw cErr;
        customerId = cIns.id;
      }
      if (form.therapist_id && !override) {
        const cf = await checkConflicts();
        if (cf.length > 0) { setConflicts(cf); setConfirmConflict(true); setBusy(false); return; }
      }
      const { start, end } = computeTimes();
      const payload: any = {
        branch_id: form.branch_id,
        customer_id: customerId || null,
        therapist_id: form.therapist_id || null,
        service_id: form.service_id,
        room_id: form.is_home_service ? null : (form.room_id || null),
        booking_type: form.booking_type,
        booking_date: form.booking_date,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: form.status,
        payment_status: form.payment_status,
        payment_method: form.payment_method || null,
        is_home_service: !!form.is_home_service,
        service_address: form.is_home_service ? (form.service_address || null) : null,
        notes: form.notes || null,
      };
      if (existing) {
        const { error } = await supabase.from("bookings").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bookings").insert(payload);
        if (error) throw error;
      }
      toast.success("Booking saved");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{existing ? "Edit booking" : "New booking"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.booking_type} onValueChange={(v) => setForm({ ...form, booking_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BOOKING_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Branch">
              <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v, room_id: "", therapist_id: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Customer" className="col-span-2">
              {!creatingCustomer ? (
                <div className="flex gap-2">
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.slice(0, 200).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name} {c.phone && `· ${c.phone}`}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={() => setCreatingCustomer(true)}>+ New</Button>
                </div>
              ) : (
                <div className="space-y-2 border rounded p-3 bg-muted/30">
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="Full name" value={newCustomer.full_name} onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })} />
                    <Input placeholder="Phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                    <Input placeholder="Email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                  </div>
                  {dupCustomers.length > 0 && (
                    <div className="text-xs">
                      <div className="text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Possible duplicates:</div>
                      <ul className="mt-1 space-y-1">
                        {dupCustomers.map((c: any) => (
                          <li key={c.id}>
                            <button type="button" className="text-blue-600 hover:underline" onClick={() => { setForm({ ...form, customer_id: c.id }); setCreatingCustomer(false); }}>
                              Use existing: {c.full_name} {c.phone && `· ${c.phone}`}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => setCreatingCustomer(false)}>Cancel</Button>
                </div>
              )}
            </Field>
            <Field label="Service">
              <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{services.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m)</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Therapist">
              <Select value={form.therapist_id} onValueChange={(v) => setForm({ ...form, therapist_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{branchTherapists.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Date"><Input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} /></Field>
            <Field label="Start time"><Input type="time" value={form.start_hhmm} onChange={(e) => setForm({ ...form, start_hhmm: e.target.value })} /></Field>
            <Field label="Home service?" className="col-span-2">
              <div className="flex items-center gap-3">
                <Switch checked={!!form.is_home_service} onCheckedChange={(v) => setForm({ ...form, is_home_service: v })} />
                <span className="text-sm text-muted-foreground">Toggle on for at-home appointments (no room required)</span>
              </div>
            </Field>
            {form.is_home_service ? (
              <Field label="Service address" className="col-span-2"><Textarea rows={2} value={form.service_address} onChange={(e) => setForm({ ...form, service_address: e.target.value })} /></Field>
            ) : (
              <Field label="Room">
                <Select value={form.room_id} onValueChange={(v) => setForm({ ...form, room_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{branchRooms.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Payment status">
              <Select value={form.payment_status} onValueChange={(v) => setForm({ ...form, payment_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Payment method">
              <Select value={form.payment_method ?? ""} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Notes" className="col-span-2"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => submit(false)} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmConflict} onOpenChange={setConfirmConflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Therapist conflict detected</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  {conflicts.map((c, i) => <li key={i}><span className="font-medium">{c.reason.replace(/_/g," ")}:</span> {c.detail}</li>)}
                </ul>
                <p className="mt-3 text-sm">Do you want to override and proceed anyway?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmConflict(false); submit(true); }}>Override and save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
