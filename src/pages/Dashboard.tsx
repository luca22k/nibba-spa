import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { fmtMoney } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { CalendarDays, DollarSign, Users, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { role } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const [stats, setStats] = useState({ revenue: 0, todayBookings: 0, customers: 0, therapists: 0 });
  const [byBranch, setByBranch] = useState<{ name: string; revenue: number; bookings: number }[]>([]);
  const [topServices, setTopServices] = useState<{ name: string; count: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [auditRecent, setAuditRecent] = useState<any[]>([]);

  const branchFilter = selectedBranchId === "all" ? null : selectedBranchId;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    (async () => {
      const payQ = supabase.from("payments").select("final_amount,branch_id").eq("status", "paid").eq("is_deleted", false);
      const bkQ = supabase.from("bookings").select("id,branch_id,start_time,status,customer_id,therapist_id,service_id, customers(full_name), therapists(full_name), services(name)").eq("is_deleted", false).eq("booking_date", today).order("start_time");
      const custQ = supabase.from("customers").select("id", { count: "exact", head: true }).eq("is_deleted", false);
      const therQ = supabase.from("therapists").select("id,branch_id", { count: "exact" }).eq("is_deleted", false);
      const auditQ = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8);

      const [pay, bk, cust, ther, audit] = await Promise.all([
        branchFilter ? payQ.eq("branch_id", branchFilter) : payQ,
        branchFilter ? bkQ.eq("branch_id", branchFilter) : bkQ,
        custQ,
        branchFilter ? therQ.eq("branch_id", branchFilter) : therQ,
        branchFilter ? auditQ.eq("branch_id", branchFilter) : auditQ,
      ]);

      const revenue = (pay.data ?? []).reduce((s, p) => s + Number(p.final_amount), 0);
      setStats({
        revenue,
        todayBookings: bk.data?.length ?? 0,
        customers: cust.count ?? 0,
        therapists: ther.data?.length ?? 0,
      });
      setRecent(bk.data ?? []);
      setAuditRecent(audit.data ?? []);

      // by branch
      if (!branchFilter && branches.length) {
        const map = new Map(branches.map((b) => [b.id, { name: b.name, revenue: 0, bookings: 0 }]));
        (pay.data ?? []).forEach((p: any) => { const e = map.get(p.branch_id); if (e) e.revenue += Number(p.final_amount); });
        (bk.data ?? []).forEach((b: any) => { const e = map.get(b.branch_id); if (e) e.bookings += 1; });
        setByBranch([...map.values()]);
      } else setByBranch([]);

      // top services
      const sCount: Record<string, number> = {};
      (bk.data ?? []).forEach((b: any) => { const n = b.services?.name; if (n) sCount[n] = (sCount[n] ?? 0) + 1; });
      setTopServices(Object.entries(sCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5));
    })();
  }, [branchFilter, branches.length]);

  return (
    <div>
      <PageHeader title={role === "owner" ? "Owner Dashboard" : "Admin Dashboard"} description="Overview of business performance and today's activity." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total revenue (paid)" value={fmtMoney(stats.revenue)} />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Bookings today" value={stats.todayBookings} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Customers" value={stats.customers} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Therapists" value={stats.therapists} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {byBranch.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Revenue by branch</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBranch}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        <Card className={byBranch.length ? "" : "lg:col-span-3"}>
          <CardHeader><CardTitle className="text-base">Top services today</CardTitle></CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet today.</p>
            ) : (
              <ul className="space-y-2">
                {topServices.map((s) => (
                  <li key={s.name} className="flex justify-between text-sm">
                    <span>{s.name}</span><span className="font-medium">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Today's bookings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? <p className="text-sm text-muted-foreground">No bookings.</p> :
              recent.slice(0, 8).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{b.customers?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.services?.name} · {b.therapists?.full_name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {auditRecent.length === 0 ? <p className="text-sm text-muted-foreground">No activity.</p> :
              auditRecent.map((a: any) => (
                <div key={a.id} className="text-sm border-b pb-2 last:border-0">
                  <div><span className="font-medium">{a.user_name || "System"}</span> <span className="text-muted-foreground">{a.action_type.toLowerCase()}d {a.entity}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide">
          <span>{label}</span>{icon}
        </div>
        <div className="text-2xl font-semibold mt-2">{value}</div>
      </CardContent>
    </Card>
  );
}
