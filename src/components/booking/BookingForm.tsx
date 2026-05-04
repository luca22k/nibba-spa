import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { CustomerCombobox, CustomerLite } from "./CustomerCombobox";
import { AddonsSelector, AddonOption } from "./AddonsSelector";
import { TherapistLineupPanel } from "./TherapistLineupPanel";
import { PhoneInput } from "@/components/PhoneInput";
import { PHAddressFields } from "@/components/PHAddressFields";
import { fromE164, toE164 } from "@/lib/phone";

const BOOKING_TYPES = ["walk_in","phone","online","repeat"] as const;
const STATUSES = ["confirmed","in_progress","completed","cancelled","no_show"] as const;
const PAYMENT_METHODS = ["cash","card","gcash","maya","bank_transfer","other"] as const;
const PAYMENT_STATUSES = ["unpaid","partially_paid","paid","refunded","cancelled"] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  existing: any | null;
  branches: { id: string; name: string }[];
  defaultBranchId?: string;
  onSaved: () => void;
}

interface NewCustomerDraft {
  full_name: string;
  phone: string;     // local 9XXX...
  email: string;
  has_allergy: boolean;
  allergies: string;
  notes: string;
  preferred_therapist_id: string;
  duplicate_override_note: string;
  duplicates: CustomerLite[];
}

export function BookingForm({ open, onClose, existing, branches, defaultBranchId, onSaved }: Props) {
  const [services, setServices] = useState<any[]>([]);
  const [durations, setDurations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);

  const [branchId, setBranchId] = useState<string>(existing?.branch_id ?? defaultBranchId ?? branches[0]?.id ?? "");
  const [bookingType, setBookingType] = useState<string>(existing?.booking_type ?? "walk_in");
  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [creatingNew, setCreatingNew] = useState<NewCustomerDraft | null>(null);

  const [serviceId, setServiceId] = useState<string>(existing?.service_id ?? "");
  const [durationMin, setDurationMin] = useState<number>(existing?.duration_minutes ?? 60);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [addonItems, setAddonItems] = useState<AddonOption[]>([]);

  const [therapistId, setTherapistId] = useState<string>(existing?.therapist_id ?? "");
  const [date, setDate] = useState<string>(existing?.booking_date ?? new Date().toISOString().slice(0, 10));
  const [startHHMM, setStartHHMM] = useState<string>(() => {
    if (existing?.start_time) {
      const d = new Date(existing.start_time); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    } return "10:00";
  });
  const [isHome, setIsHome] = useState<boolean>(existing?.is_home_service ?? false);
  const [roomId, setRoomId] = useState<string>(existing?.room_id ?? "");
  const [address, setAddress] = useState<import("@/lib/address").PHAddress>({
    region: existing?.address_region ?? null,
    province: existing?.address_province ?? null,
    city: existing?.address_city ?? null,
    barangay: existing?.address_barangay ?? null,
    line1: existing?.address_line1 ?? null,
    line2: existing?.address_line2 ?? null,
  });
  const [status, setStatus] = useState<string>(existing?.status && existing.status !== "pending" ? existing.status : "confirmed");
  const [paymentStatus, setPaymentStatus] = useState<string>(existing?.payment_status ?? "unpaid");
  const [paymentMethod, setPaymentMethod] = useState<string>(existing?.payment_method ?? "cash");
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Load reference data
  useEffect(() => {
    (async () => {
      const [s, r, t] = await Promise.all([
        supabase.from("services").select("id,name,category,base_price").eq("is_deleted", false).eq("is_active", true).order("name"),
        supabase.from("rooms").select("id,name,branch_id").eq("is_deleted", false).eq("is_active", true),
        supabase.from("therapists").select("id,full_name,branch_id").eq("is_deleted", false),
      ]);
      setServices(s.data ?? []); setRooms(r.data ?? []); setTherapists(t.data ?? []);
    })();
  }, []);

  // Pre-load customer if editing
  useEffect(() => {
    if (existing?.customer_id) {
      supabase.from("customers").select("id,full_name,phone,email").eq("id", existing.customer_id).maybeSingle().then(({ data }) => {
        if (data) setCustomer(data as any);
      });
    }
  }, [existing?.customer_id]);

  // Load durations when service changes
  useEffect(() => {
    if (!serviceId) { setDurations([]); return; }
    (async () => {
      const { data } = await supabase
        .from("service_durations")
        .select("id,duration_minutes,price")
        .eq("service_id", serviceId)
        .eq("is_active", true)
        .order("duration_minutes");
      const d = data ?? [];
      setDurations(d);
      // pick default duration
      const match = d.find((x: any) => x.duration_minutes === durationMin) ?? d[0];
      if (match) {
        setDurationMin(match.duration_minutes);
        setUnitPrice(Number(match.price));
      } else {
        setUnitPrice(0);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  // When duration selection changes via UI
  const onDurationChange = (val: string) => {
    const dm = Number(val);
    setDurationMin(dm);
    const d = durations.find((x: any) => x.duration_minutes === dm);
    if (d) setUnitPrice(Number(d.price));
  };

  const branchRooms = rooms.filter((r) => r.branch_id === branchId);
  const service = services.find((s) => s.id === serviceId);

  const total = useMemo(() => {
    return Number(unitPrice || 0) + addonItems.reduce((s, a) => s + Number(a.price), 0);
  }, [unitPrice, addonItems]);

  const startCreatingCustomer = (initialName: string) => {
    setCreatingNew({
      full_name: initialName, phone: "", email: "",
      has_allergy: false, allergies: "", notes: "",
      preferred_therapist_id: "", duplicate_override_note: "", duplicates: [],
    });
  };

  // duplicate detection (live)
  useEffect(() => {
    if (!creatingNew) return;
    const handle = setTimeout(async () => {
      const name = creatingNew.full_name.trim();
      const phone = creatingNew.phone.trim();
      if (name.length < 2 && !phone) { setCreatingNew((c) => c ? { ...c, duplicates: [] } : c); return; }
      const filters: string[] = [];
      if (name.length >= 2) filters.push(`full_name.ilike.%${name}%`);
      if (phone) filters.push(`phone.ilike.%${phone}%`);
      const { data } = await supabase
        .from("customers")
        .select("id,full_name,phone,email")
        .eq("is_deleted", false)
        .or(filters.join(","))
        .limit(5);
      setCreatingNew((c) => c ? { ...c, duplicates: (data ?? []) as any } : c);
    }, 300);
    return () => clearTimeout(handle);
  }, [creatingNew?.full_name, creatingNew?.phone]);

  const validate = (): string | null => {
    if (!serviceId) return "Service is required";
    if (!therapistId) return "Therapist is required";
    if (!date) return "Date is required";
    if (!startHHMM) return "Start time is required";
    if (!isHome && !roomId) return "Room is required (or toggle Home Service)";
    if (isHome && (!address.line1 || !address.city)) return "Home service address (city + line 1) is required";
    if (!status) return "Status is required";
    if (!paymentStatus) return "Payment status is required";
    if (!paymentMethod) return "Payment method is required";
    if (!customer && !creatingNew?.full_name) return "Customer is required";
    if (creatingNew && creatingNew.duplicates.length > 0 && !creatingNew.duplicate_override_note.trim()) {
      return "Possible duplicate customer — provide an override note or pick existing";
    }
    return null;
  };

  const computeTimes = () => {
    const [hh, mm] = startHHMM.split(":").map(Number);
    const start = new Date(`${date}T00:00:00`);
    start.setHours(hh, mm, 0, 0);
    const totalDuration = durationMin + addonItems.reduce((s, a) => s + (a.duration_minutes ?? 0), 0);
    const end = new Date(start.getTime() + totalDuration * 60000);
    return { start, end, totalDuration };
  };

  const onSubmit = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setConfirmOpen(true);
  };

  const finalSave = async () => {
    setBusy(true);
    try {
      let customerId = customer?.id ?? null;
      // Create or update customer NOW (only on confirm)
      if (creatingNew) {
        const phoneE164 = toE164(creatingNew.phone) || null;
        const insert: any = {
          full_name: creatingNew.full_name.trim(),
          phone: phoneE164,
          email: creatingNew.email || null,
          has_allergy: creatingNew.has_allergy,
          allergies: creatingNew.has_allergy ? (creatingNew.allergies || null) : null,
          notes: creatingNew.notes || null,
          preferred_therapist_id: creatingNew.preferred_therapist_id || null,
          duplicate_override_note: creatingNew.duplicates.length ? creatingNew.duplicate_override_note : null,
        };
        const { data: cIns, error: cErr } = await supabase.from("customers").insert(insert).select().single();
        if (cErr) throw cErr;
        customerId = cIns.id;
      }

      const { start, end, totalDuration } = computeTimes();
      const payload: any = {
        branch_id: branchId,
        customer_id: customerId,
        therapist_id: therapistId,
        service_id: serviceId,
        room_id: isHome ? null : (roomId || null),
        booking_type: bookingType,
        booking_date: date,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        is_home_service: isHome,
        service_address: isHome ? [address.line1, address.line2, address.barangay, address.city, address.province, address.region].filter(Boolean).join(", ") : null,
        address_region: isHome ? address.region : null,
        address_province: isHome ? address.province : null,
        address_city: isHome ? address.city : null,
        address_barangay: isHome ? address.barangay : null,
        address_line1: isHome ? address.line1 : null,
        address_line2: isHome ? address.line2 : null,
        duration_minutes: totalDuration,
        total_amount: total,
        notes: notes || null,
      };

      let bookingId: string;
      if (existing) {
        const { error } = await supabase.from("bookings").update(payload).eq("id", existing.id);
        if (error) throw error;
        bookingId = existing.id;
        // wipe and re-insert addons
        await supabase.from("booking_addons").delete().eq("booking_id", bookingId);
      } else {
        const { data: bIns, error } = await supabase.from("bookings").insert(payload).select().single();
        if (error) throw error;
        bookingId = bIns.id;
      }

      if (addonItems.length) {
        await supabase.from("booking_addons").insert(addonItems.map((a) => ({
          booking_id: bookingId, addon_id: a.id, price: a.price,
        })));
      }

      toast.success(existing ? "Booking updated" : "Booking created");
      setConfirmOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{existing ? "Edit booking" : "New booking"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: form */}
            <div className="lg:col-span-2 space-y-4">
              <SectionTitle>1. Customer</SectionTitle>
              {!creatingNew ? (
                <CustomerCombobox selected={customer} onSelect={setCustomer} onCreateNew={startCreatingCustomer} />
              ) : (
                <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full name *">
                      <Input value={creatingNew.full_name} onChange={(e) => setCreatingNew({ ...creatingNew, full_name: e.target.value })} />
                    </Field>
                    <Field label="Mobile number *">
                      <PhoneInput value={creatingNew.phone} onChange={(v) => setCreatingNew({ ...creatingNew, phone: v })} />
                    </Field>
                    <Field label="Email">
                      <Input type="email" value={creatingNew.email} onChange={(e) => setCreatingNew({ ...creatingNew, email: e.target.value })} />
                    </Field>
                    <Field label="Preferred therapist">
                      <Select value={creatingNew.preferred_therapist_id} onValueChange={(v) => setCreatingNew({ ...creatingNew, preferred_therapist_id: v })}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {therapists.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={creatingNew.has_allergy} onCheckedChange={(v) => setCreatingNew({ ...creatingNew, has_allergy: !!v })} />
                    Customer has allergy
                  </label>
                  {creatingNew.has_allergy && (
                    <Textarea rows={2} placeholder="Allergy details" value={creatingNew.allergies} onChange={(e) => setCreatingNew({ ...creatingNew, allergies: e.target.value })} />
                  )}
                  <Textarea rows={2} placeholder="Notes" value={creatingNew.notes} onChange={(e) => setCreatingNew({ ...creatingNew, notes: e.target.value })} />

                  {creatingNew.duplicates.length > 0 && (
                    <div className="border border-amber-300 bg-amber-50 rounded p-2 text-xs space-y-1">
                      <div className="font-medium text-amber-800 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Possible duplicates:</div>
                      <ul className="space-y-1">
                        {creatingNew.duplicates.map((d) => (
                          <li key={d.id}>
                            <button type="button" className="text-blue-700 hover:underline" onClick={() => { setCustomer(d); setCreatingNew(null); }}>
                              Use existing: {d.full_name} {d.phone && `· ${d.phone}`}
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div>
                        <Label className="text-xs">Override note (required to save as new)</Label>
                        <Input value={creatingNew.duplicate_override_note} onChange={(e) => setCreatingNew({ ...creatingNew, duplicate_override_note: e.target.value })} placeholder="Reason for new record" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCreatingNew(null)}>Cancel new customer</Button>
                  </div>
                </div>
              )}

              <Separator />
              <SectionTitle>2. Service</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Branch *">
                  <Select value={branchId} onValueChange={(v) => { setBranchId(v); setRoomId(""); setTherapistId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Booking type">
                  <Select value={bookingType} onValueChange={setBookingType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BOOKING_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Service *">
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Duration *">
                  <Select value={String(durationMin)} onValueChange={onDurationChange} disabled={!durations.length}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {durations.map((d: any) => (
                        <SelectItem key={d.id} value={String(d.duration_minutes)}>
                          {d.duration_minutes} mins — {fmtMoney(d.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div>
                <Label className="text-xs">Add-ons</Label>
                <div className="mt-1">
                  <AddonsSelector selectedIds={addonIds} onChange={(ids, items) => { setAddonIds(ids); setAddonItems(items); }} />
                </div>
              </div>

              <Separator />
              <SectionTitle>3. Schedule & Location</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date *"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
                <Field label="Start time *"><Input type="time" value={startHHMM} onChange={(e) => setStartHHMM(e.target.value)} /></Field>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isHome} onCheckedChange={setIsHome} />
                <span className="text-sm">Home service</span>
              </div>
              {!isHome ? (
                <Field label="Room *">
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>{branchRooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              ) : (
                <PHAddressFields value={address} onChange={setAddress} />
              )}

              <Separator />
              <SectionTitle>4. Status & Payment</SectionTitle>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Status *">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Payment status *">
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Payment method *">
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            </div>

            {/* Right: lineup */}
            <div className="space-y-4">
              <div>
                <SectionTitle>Therapist lineup</SectionTitle>
                <p className="text-xs text-muted-foreground mb-2">Recommended order based on availability, skills and rotation.</p>
                <TherapistLineupPanel branchId={branchId || null} serviceId={serviceId || null} date={date} selectedId={therapistId || null} onSelect={setTherapistId} />
              </div>
              <Separator />
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-2xl font-semibold">{fmtMoney(total)}</div>
                {addonItems.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">Includes {addonItems.length} add-on(s)</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onSubmit}>Review & confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm booking</DialogTitle></DialogHeader>
          <div className="text-sm space-y-1.5">
            <Row k="Customer" v={customer?.full_name ?? creatingNew?.full_name ?? "—"} />
            <Row k="Mobile" v={customer?.phone ?? (creatingNew?.phone ? `+63${creatingNew.phone}` : "—")} />
            <Row k="Service" v={`${service?.name ?? "—"} (${durationMin} min)`} />
            {addonItems.length > 0 && <Row k="Add-ons" v={addonItems.map((a) => a.name).join(", ")} />}
            <Row k="Therapist" v={therapists.find((t) => t.id === therapistId)?.full_name ?? "—"} />
            <Row k="Date / time" v={`${date} ${startHHMM}`} />
            <Row k={isHome ? "Home address" : "Room"} v={isHome
              ? [address.line1, address.line2, address.barangay, address.city, address.province, address.region].filter(Boolean).join(", ")
              : (rooms.find((r) => r.id === roomId)?.name ?? "—")} />
            <Row k="Status" v={status} />
            <Row k="Payment" v={`${paymentStatus} · ${paymentMethod}`} />
            <Row k="Total" v={fmtMoney(total)} bold />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>Back</Button>
            <Button onClick={finalSave} disabled={busy}>{busy ? "Saving..." : "Confirm & save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{children}</h3>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex justify-between border-b last:border-0 py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className={bold ? "font-semibold" : ""}>{v}</span>
    </div>
  );
}
