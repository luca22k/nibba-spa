import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

const CATEGORIES = ["massage","add_on","package","home_service"];

export default function Services() {
  const { can } = useAuth();
  const editable = can("services_pricing","edit");
  return (
    <div>
      <PageHeader title="Services & Pricing" description="Service catalog, durations, branch pricing and add-ons." />
      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
        </TabsList>
        <TabsContent value="services"><ServicesTab editable={editable} /></TabsContent>
        <TabsContent value="addons"><AddonsTab editable={editable} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ServicesTab({ editable }: { editable: boolean }) {
  const [services, setServices] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const reload = async () => {
    const { data } = await supabase.from("services").select("*").eq("is_deleted", false).order("name");
    setServices(data ?? []);
  };
  useEffect(() => {
    reload();
    supabase.from("branches").select("id,name").eq("is_deleted", false).then(({ data }) => setBranches(data ?? []));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <Card className="lg:col-span-1">
        <div className="p-3 flex items-center justify-between border-b">
          <h3 className="text-sm font-semibold">Services</h3>
          {editable && <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Add</Button>}
        </div>
        <div className="divide-y">
          {services.map((s) => (
            <button key={s.id} type="button" className={`w-full text-left p-3 hover:bg-muted ${selected?.id === s.id ? "bg-muted" : ""}`} onClick={() => setSelected(s)}>
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.category} · base {fmtMoney(s.base_price)} · {s.is_active ? "active" : "inactive"}</div>
            </button>
          ))}
        </div>
      </Card>
      <Card className="lg:col-span-2 p-4">
        {!selected ? <p className="text-sm text-muted-foreground">Select a service.</p> : (
          <ServiceDetail service={selected} branches={branches} editable={editable} onEdit={() => { setEditing(selected); setOpen(true); }} onChanged={reload} />
        )}
      </Card>
      {open && <ServiceDialog existing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </div>
  );
}

function ServiceDetail({ service, branches, editable, onEdit, onChanged }: any) {
  const [durations, setDurations] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const reload = async () => {
    const [d, p] = await Promise.all([
      supabase.from("service_durations").select("*").eq("service_id", service.id).order("duration_minutes"),
      supabase.from("service_branch_pricing").select("*").eq("service_id", service.id),
    ]);
    setDurations(d.data ?? []); setPricing(p.data ?? []);
  };
  useEffect(() => { reload(); }, [service.id]);

  const addDuration = async () => {
    await supabase.from("service_durations").insert({ service_id: service.id, duration_minutes: 60, price: service.base_price });
    reload();
  };
  const updateDur = async (id: string, patch: any) => { await supabase.from("service_durations").update(patch).eq("id", id); reload(); };
  const delDur = async (id: string) => { await supabase.from("service_durations").delete().eq("id", id); reload(); };

  const upsertPricing = async (branchId: string, price: number) => {
    const ex = pricing.find((p) => p.branch_id === branchId);
    if (ex) await supabase.from("service_branch_pricing").update({ price }).eq("id", ex.id);
    else await supabase.from("service_branch_pricing").insert({ service_id: service.id, branch_id: branchId, price });
    reload();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{service.name}</h2>
          <p className="text-sm text-muted-foreground">{service.description ?? "—"}</p>
        </div>
        {editable && <Button variant="outline" size="sm" onClick={onEdit}>Edit details</Button>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Duration options</h3>
          {editable && <Button size="sm" variant="outline" onClick={addDuration}><Plus className="h-3 w-3 mr-1" /> Add duration</Button>}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Duration (m)</TableHead><TableHead>Price</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {durations.map((d) => (
              <TableRow key={d.id}>
                <TableCell><Input type="number" className="w-24 h-8" defaultValue={d.duration_minutes} onBlur={(e) => updateDur(d.id, { duration_minutes: Number(e.target.value) })} disabled={!editable} /></TableCell>
                <TableCell><Input type="number" className="w-28 h-8" defaultValue={d.price} onBlur={(e) => updateDur(d.id, { price: Number(e.target.value) })} disabled={!editable} /></TableCell>
                <TableCell><Switch checked={d.is_active} onCheckedChange={(v) => updateDur(d.id, { is_active: v })} disabled={!editable} /></TableCell>
                <TableCell className="text-right">{editable && <Button size="sm" variant="ghost" onClick={() => delDur(d.id)}><Trash2 className="h-3 w-3" /></Button>}</TableCell>
              </TableRow>
            ))}
            {durations.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm">No durations defined.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Branch-specific pricing</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Branch</TableHead><TableHead>Price</TableHead></TableRow></TableHeader>
          <TableBody>
            {branches.map((b: any) => {
              const p = pricing.find((x) => x.branch_id === b.id);
              return (
                <TableRow key={b.id}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell><Input type="number" className="w-32 h-8" defaultValue={p?.price ?? service.base_price} onBlur={(e) => upsertPricing(b.id, Number(e.target.value))} disabled={!editable} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ServiceDialog({ existing, onClose, onSaved }: { existing: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(existing ?? { name: "", category: "massage", base_price: 0, duration_minutes: 60, description: "", is_active: true });
  const save = async () => {
    try {
      if (existing) {
        const { error } = await supabase.from("services").update(form).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(form);
        if (error) throw error;
      }
      toast.success("Saved"); onSaved();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Base price</Label><Input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} /></div>
          </div>
          <div><Label className="text-xs">Description</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddonsTab({ editable }: { editable: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const reload = async () => {
    const { data } = await supabase.from("service_addons").select("*").eq("is_deleted", false).order("name");
    setRows(data ?? []);
  };
  useEffect(() => { reload(); }, []);

  return (
    <div className="mt-4">
      <Card className="p-3 flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Add-on services</h3>
        {editable && <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Add</Button>}
      </Card>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Duration</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{fmtMoney(r.price)}</TableCell>
                <TableCell>{r.duration_minutes ?? 0} m</TableCell>
                <TableCell>
                  <Switch checked={r.is_active} onCheckedChange={async (v) => { await supabase.from("service_addons").update({ is_active: v }).eq("id", r.id); reload(); }} disabled={!editable} />
                </TableCell>
                <TableCell className="text-right">{editable && <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No add-ons.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      {open && <AddonDialog existing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </div>
  );
}

function AddonDialog({ existing, onClose, onSaved }: { existing: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(existing ?? { name: "", price: 0, duration_minutes: 0, description: "", is_active: true });
  const save = async () => {
    try {
      if (existing) await supabase.from("service_addons").update(form).eq("id", existing.id);
      else await supabase.from("service_addons").insert(form);
      toast.success("Saved"); onSaved();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit add-on" : "New add-on"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Price</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Extra duration (m)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
          </div>
          <div><Label className="text-xs">Description</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
