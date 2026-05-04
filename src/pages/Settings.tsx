import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { role } = useAuth();
  const isOwner = role === "owner";
  return (
    <div>
      <PageHeader title="Settings" description="Business and configuration settings." />
      <RoomsSection canEdit={isOwner} />
      <Card className="p-4 mt-4">
        <h3 className="font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground mt-1">Automated reminders via Messenger / SMS / Email — coming in Version 2.</p>
      </Card>
    </div>
  );
}

function RoomsSection({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const reload = async () => {
    const { data } = await supabase.from("rooms").select("*, branches(name)").eq("is_deleted", false).order("name");
    setRows(data ?? []);
  };
  useEffect(() => {
    reload();
    supabase.from("branches").select("id,name").eq("is_deleted", false).then(({ data }) => setBranches(data ?? []));
  }, []);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b">
        <div>
          <h3 className="font-medium">Rooms</h3>
          <p className="text-xs text-muted-foreground">Manage rooms available for in-spa bookings.</p>
        </div>
        {canEdit && <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add room</Button>}
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Branch</TableHead><TableHead>Active</TableHead><TableHead>Notes</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No rooms.</TableCell></TableRow>}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.branches?.name ?? "—"}</TableCell>
              <TableCell>
                <Switch checked={r.is_active} onCheckedChange={async (v) => { await supabase.from("rooms").update({ is_active: v }).eq("id", r.id); reload(); }} disabled={!canEdit} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.notes ?? "—"}</TableCell>
              <TableCell className="text-right">
                {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {open && <RoomDialog existing={editing} branches={branches} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </Card>
  );
}

function RoomDialog({ existing, branches, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(existing ?? { name: "", branch_id: branches[0]?.id ?? "", is_active: true, notes: "" });
  const save = async () => {
    if (!form.name || !form.branch_id) { toast.error("Name and branch required"); return; }
    try {
      if (existing) await supabase.from("rooms").update(form).eq("id", existing.id);
      else await supabase.from("rooms").insert(form);
      toast.success("Saved"); onSaved();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit room" : "New room"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label className="text-xs">Branch</Label>
            <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active</label>
          <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
