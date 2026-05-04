import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtTime } from "@/lib/format";
import { toast } from "sonner";

const STATUSES = ["present","absent","late","leave","off_duty"] as const;

export default function Attendance() {
  const { can } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const branchId = selectedBranchId === "all" ? branches[0]?.id : selectedBranchId;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [therapists, setTherapists] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const reload = async () => {
    if (!branchId) return;
    const [{ data: ts }, { data: ar }] = await Promise.all([
      supabase.from("therapists").select("id,full_name").eq("branch_id", branchId).eq("is_deleted", false).order("full_name"),
      supabase.from("attendance_records").select("*").eq("branch_id", branchId).eq("date", date),
    ]);
    setTherapists(ts ?? []);
    setRecords(ar ?? []);
  };

  useEffect(() => { reload(); }, [branchId, date]);

  const getRec = (tId: string) => records.find((r) => r.therapist_id === tId);

  const upsert = async (tId: string, patch: any) => {
    const existing = getRec(tId);
    const payload: any = { therapist_id: tId, branch_id: branchId, date, ...patch };
    try {
      if (existing) {
        const { error } = await supabase.from("attendance_records").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance_records").insert(payload);
        if (error) throw error;
      }
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  if (!branchId) return <p className="text-sm text-muted-foreground p-6">Select a branch.</p>;

  return (
    <div>
      <PageHeader title="Attendance" description="Daily roster, clock-in/out, lateness and leave tracking." />
      <Card className="p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Therapist</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clock in</TableHead>
              <TableHead>Clock out</TableHead>
              <TableHead>Late (m)</TableHead>
              <TableHead>Under (m)</TableHead>
              <TableHead>Over (m)</TableHead>
              {can("attendance","edit") && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {therapists.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No therapists.</TableCell></TableRow>}
            {therapists.map((t) => {
              const r = getRec(t.id);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell>
                    {can("attendance","edit") ? (
                      <Select value={r?.status ?? "present"} onValueChange={(v) => upsert(t.id, { status: v })}>
                        <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <StatusBadge status={r?.status ?? "present"} />}
                  </TableCell>
                  <TableCell>{r?.clock_in ? fmtTime(r.clock_in) : "—"}</TableCell>
                  <TableCell>{r?.clock_out ? fmtTime(r.clock_out) : "—"}</TableCell>
                  <TableCell>
                    <Input type="number" className="w-20 h-8" value={r?.late_minutes ?? 0} onChange={(e) => upsert(t.id, { late_minutes: Number(e.target.value) })} disabled={!can("attendance","edit")} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="w-20 h-8" value={r?.undertime_minutes ?? 0} onChange={(e) => upsert(t.id, { undertime_minutes: Number(e.target.value) })} disabled={!can("attendance","edit")} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="w-20 h-8" value={r?.overtime_minutes ?? 0} onChange={(e) => upsert(t.id, { overtime_minutes: Number(e.target.value) })} disabled={!can("attendance","edit")} />
                  </TableCell>
                  {can("attendance","edit") && (
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => upsert(t.id, { clock_in: new Date().toISOString(), status: r?.status ?? "present" })}>Clock in</Button>
                      <Button size="sm" variant="outline" onClick={() => upsert(t.id, { clock_out: new Date().toISOString() })}>Clock out</Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
