import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PhoneInput } from "@/components/PhoneInput";
import { fromE164, toE164 } from "@/lib/phone";
import { fmtDate } from "@/lib/format";

interface Customer {
  id: string; full_name: string; phone: string | null; email: string | null;
  has_allergy?: boolean; allergies: string | null; notes: string | null;
  preferred_therapist_id: string | null; last_visit_date: string | null;
  duplicate_override_note?: string | null;
}

export default function Customers() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Customer[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const reload = async () => {
    const { data } = await supabase.from("customers").select("*").eq("is_deleted", false).order("full_name").limit(500);
    setRows((data ?? []) as any);
  };

  useEffect(() => {
    reload();
    supabase.from("therapists").select("id,full_name").eq("is_deleted", false).then(({ data }) => setTherapists(data ?? []));
  }, []);

  const filtered = rows.filter((r) =>
    !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer records with duplicate prevention."
        actions={can("customers","edit") && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add customer</Button>}
      />

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
              <TableHead>Allergy</TableHead><TableHead>Last visit</TableHead>
              {can("customers","edit") && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No customers.</TableCell></TableRow>}
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.full_name}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell>{c.has_allergy ? (c.allergies ?? "Yes") : "—"}</TableCell>
                <TableCell>{c.last_visit_date ? fmtDate(c.last_visit_date) : "—"}</TableCell>
                {can("customers","edit") && (
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>Edit</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {open && (
        <CustomerDialog
          existing={editing}
          therapists={therapists}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

function CustomerDialog({ existing, therapists, onClose, onSaved }: { existing: Customer | null; therapists: any[]; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(existing?.full_name ?? "");
  const [phone, setPhone] = useState(fromE164(existing?.phone));
  const [email, setEmail] = useState(existing?.email ?? "");
  const [hasAllergy, setHasAllergy] = useState(!!existing?.has_allergy);
  const [allergies, setAllergies] = useState(existing?.allergies ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [preferred, setPreferred] = useState(existing?.preferred_therapist_id ?? "");
  const [overrideNote, setOverrideNote] = useState(existing?.duplicate_override_note ?? "");
  const [duplicates, setDuplicates] = useState<Customer[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!fullName && !phone) { setDuplicates([]); return; }
      const filters: string[] = [];
      if (fullName.length >= 2) filters.push(`full_name.ilike.%${fullName}%`);
      if (phone) filters.push(`phone.ilike.%${phone}%`);
      let q = supabase.from("customers").select("*").eq("is_deleted", false).or(filters.join(",")).limit(5);
      const { data } = await q;
      setDuplicates(((data ?? []) as Customer[]).filter((c) => c.id !== existing?.id));
    }, 300);
    return () => clearTimeout(handle);
  }, [fullName, phone, existing?.id]);

  const save = async () => {
    if (!fullName.trim()) { toast.error("Name required"); return; }
    if (duplicates.length > 0 && !overrideNote.trim()) { toast.error("Possible duplicate — provide override note"); return; }
    setBusy(true);
    try {
      const payload: any = {
        full_name: fullName.trim(),
        phone: toE164(phone) || null,
        email: email || null,
        has_allergy: hasAllergy,
        allergies: hasAllergy ? (allergies || null) : null,
        notes: notes || null,
        preferred_therapist_id: preferred || null,
        duplicate_override_note: duplicates.length ? overrideNote : null,
      };
      if (existing) {
        const { error } = await supabase.from("customers").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      onSaved();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{existing ? "Edit customer" : "Add customer"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Full name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Mobile number</Label>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Preferred therapist</Label>
            <Select value={preferred} onValueChange={setPreferred}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{therapists.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={hasAllergy} onCheckedChange={(v) => setHasAllergy(!!v)} />
            Customer has allergy
          </label>
          {hasAllergy && <Textarea rows={2} placeholder="Allergy details" value={allergies} onChange={(e) => setAllergies(e.target.value)} />}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {duplicates.length > 0 && (
            <div className="border border-amber-300 bg-amber-50 rounded p-2 text-xs">
              <div className="font-medium text-amber-800 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Possible duplicates:</div>
              <ul className="my-1 space-y-1">{duplicates.map((d) => <li key={d.id}>{d.full_name} {d.phone ?? ""}</li>)}</ul>
              <Label className="text-xs">Override note (required to save as new)</Label>
              <Input value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
