import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranch } from "@/context/BranchContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";

export default function GenericList({
  title, description, table, columns, branchScoped = true, extraSelect = "",
}: {
  title: string; description?: string; table: string;
  columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode; status?: boolean }[];
  branchScoped?: boolean; extraSelect?: string;
}) {
  const { selectedBranchId } = useBranch();
  const [rows, setRows] = useState<any[]>([]);
  const branchFilter = selectedBranchId === "all" ? null : selectedBranchId;

  useEffect(() => {
    (async () => {
      let q: any = supabase.from(table as any).select("*" + (extraSelect ? "," + extraSelect : "")).order("created_at", { ascending: false }).limit(200);
      try { q = q.eq("is_deleted", false); } catch {}
      if (branchScoped && branchFilter) q = q.eq("branch_id", branchFilter);
      const { data } = await q;
      setRows(data ?? []);
    })();
  }, [branchFilter, table]);

  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>{columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10">No records</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                {columns.map((c) => {
                  const v = c.key.split(".").reduce((o, k) => o?.[k], r);
                  return <TableCell key={c.key}>{c.render ? c.render(v, r) : c.status ? <StatusBadge status={String(v ?? "")} /> : (v ?? "—")}</TableCell>;
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
