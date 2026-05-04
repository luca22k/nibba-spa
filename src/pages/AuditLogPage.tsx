import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranch } from "@/context/BranchContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const ENTITIES = [
  "bookings","customers","payments","services","service_durations","service_addons",
  "rooms","attendance_records","therapist_schedules","therapist_skills","therapists",
  "admin_permissions","branches","service_branch_pricing",
];
const ACTIONS = ["INSERT","UPDATE","DELETE"];

const ACTION_LABEL: Record<string,string> = { INSERT: "created", UPDATE: "updated", DELETE: "deleted" };

export default function AuditLogPage() {
  const { selectedBranchId } = useBranch();
  const branchId = selectedBranchId === "all" ? null : selectedBranchId;
  const [rows, setRows] = useState<any[]>([]);
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
      if (branchId) q = q.eq("branch_id", branchId);
      if (entity !== "all") q = q.eq("entity", entity);
      if (action !== "all") q = q.eq("action_type", action);
      const { data } = await q;
      setRows(data ?? []);
    })();
  }, [branchId, entity, action]);

  const filtered = rows.filter((r) => !search || (r.user_name ?? "").toLowerCase().includes(search.toLowerCase()) || (r.entity ?? "").includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Audit Log" description="Recent activity across the system. Read-only." />
      <Card className="p-4 mb-4 grid gap-2 grid-cols-1 md:grid-cols-4">
        <Input placeholder="Search user or entity..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>
      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Activity</TableHead><TableHead>Entity</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No activity.</TableCell></TableRow>}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell>{r.user_name ?? "System"}</TableCell>
                <TableCell><Badge variant="outline">{r.user_role ?? "—"}</Badge></TableCell>
                <TableCell className="text-sm">{ACTION_LABEL[r.action_type] ?? r.action_type.toLowerCase()} <span className="text-muted-foreground">{r.entity}</span></TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.entity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
