import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { fmtMoney } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { CalendarDays, DollarSign, TrendingUp, CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TodayGantt } from "@/components/TodayGantt";

type RangeKey = "today" | "week" | "two_weeks" | "month" | "all" | "custom";

function getRange(key: RangeKey, custom: { from?: Date; to?: Date }): { from: Date | null; to: Date | null } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  switch (key) {
    case "today": return { from: today, to: end };
    case "week": { const d = new Date(today); d.setDate(d.getDate() - 6); return { from: d, to: end }; }
    case "two_weeks": { const d = new Date(today); d.setDate(d.getDate() - 13); return { from: d, to: end }; }
    case "month": { const d = new Date(today); d.setDate(d.getDate() - 29); return { from: d, to: end }; }
    case "all": return { from: null, to: null };
    case "custom": return { from: custom.from ?? null, to: custom.to ?? null };
  }
}

export default function Dashboard() {
  const { role } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const branchFilter = selectedBranchId === "all" ? null : selectedBranchId;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [stats, setStats] = useState({ revenue: 0, todayBookings: 0, therapists: 0 });
  const [byBranch, setByBranch] = useState<{ name: string; revenue: number; bookings: number }[]>([]);

  const [topRange, setTopRange] = useState<RangeKey>("week");
  const [topMetric, setTopMetric] = useState<"bookings" | "revenue">("bookings");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [topServices, setTopServices] = useState<{ name: string; value: number }[]>([]);

  // KPI + by-branch
  useEffect(() => {
    (async () => {
      const payQ = supabase.from("payments").select("final_amount,branch_id").eq("status", "paid").eq("is_deleted", false);
      const bkQ = supabase.from("bookings").select("id,branch_id").eq("is_deleted", false).eq("booking_date", today);
      const therQ = supabase.from("therapists").select("id,branch_id").eq("is_deleted", false);
      const [pay, bk, ther] = await Promise.all([
        branchFilter ? payQ.eq("branch_id", branchFilter) : payQ,
        branchFilter ? bkQ.eq("branch_id", branchFilter) : bkQ,
        branchFilter ? therQ.eq("branch_id", branchFilter) : therQ,
      ]);
      const revenue = (pay.data ?? []).reduce((s: number, p: any) => s + Number(p.final_amount), 0);
      setStats({ revenue, todayBookings: bk.data?.length ?? 0, therapists: ther.data?.length ?? 0 });

      if (!branchFilter && branches.length) {
        const map = new Map(branches.map((b) => [b.id, { name: b.name, revenue: 0, bookings: 0 }]));
        (pay.data ?? []).forEach((p: any) => { const e = map.get(p.branch_id); if (e) e.revenue += Number(p.final_amount); });
        (bk.data ?? []).forEach((b: any) => { const e = map.get(b.branch_id); if (e) e.bookings += 1; });
        setByBranch([...map.values()]);
      } else setByBranch([]);
    })();
  }, [branchFilter, branches.length, today]);

  // Top services with date filter
  useEffect(() => {
    (async () => {
      const { from, to } = getRange(topRange, customRange);
      let q = supabase
        .from("bookings")
        .select("service_id, total_amount, services(name)")
        .eq("is_deleted", false)
        .neq("status", "cancelled");
      if (branchFilter) q = q.eq("branch_id", branchFilter);
      if (from) q = q.gte("booking_date", from.toISOString().slice(0, 10));
      if (to)   q = q.lte("booking_date", to.toISOString().slice(0, 10));
      const { data } = await q;
      const map = new Map<string, number>();
      (data ?? []).forEach((b: any) => {
        const name = b.services?.name ?? "—";
        const v = topMetric === "bookings" ? 1 : Number(b.total_amount ?? 0);
        map.set(name, (map.get(name) ?? 0) + v);
      });
      const arr = [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
      setTopServices(arr);
    })();
  }, [topRange, topMetric, customRange.from, customRange.to, branchFilter]);

  return (
    <div>
      <PageHeader title={role === "owner" ? "Owner Dashboard" : "Admin Dashboard"} description="Overview of business performance and today's activity." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total revenue (paid)" value={fmtMoney(stats.revenue)} />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Bookings today" value={stats.todayBookings} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Therapists" value={stats.therapists} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {byBranch.length > 0 && (
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-base">Revenue by branch</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBranch}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        <Card className={byBranch.length ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Top services</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={topMetric} onValueChange={(v) => setTopMetric(v as any)}>
                  <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bookings">By bookings</SelectItem>
                    <SelectItem value="revenue">By revenue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={topRange} onValueChange={(v) => setTopRange(v as RangeKey)}>
                  <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="two_weeks">Past 2 weeks</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
                {topRange === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {customRange.from ? customRange.from.toLocaleDateString() : "From"}
                        {" → "}
                        {customRange.to ? customRange.to.toLocaleDateString() : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar mode="range" selected={customRange as any} onSelect={(r: any) => setCustomRange(r ?? {})} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data for this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="name" type="category" fontSize={11} width={120} />
                  <Tooltip formatter={(v: any) => topMetric === "revenue" ? fmtMoney(Number(v)) : v} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Today's therapist schedule</CardTitle></CardHeader>
          <CardContent>
            <TodayGantt branchId={branchFilter} date={today} />
          </CardContent>
        </Card>
      </div>

      <TodayBookings branchId={branchFilter} date={today} />
    </div>
  );
}

function TodayBookings({ branchId, date }: { branchId: string | null; date: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const [therapistF, setTherapistF] = useState("all");
  const [serviceF, setServiceF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [payF, setPayF] = useState("all");
  const [roomF, setRoomF] = useState("all");
  const [typeF, setTypeF] = useState("all");
  const [customer, setCustomer] = useState("");

  useEffect(() => {
    (async () => {
      const [t, s, r] = await Promise.all([
        supabase.from("therapists").select("id,full_name,branch_id"),
        supabase.from("services").select("id,name"),
        supabase.from("rooms").select("id,name,branch_id"),
      ]);
      setTherapists(t.data ?? []); setServices(s.data ?? []); setRooms(r.data ?? []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("bookings")
        .select("id,start_time,end_time,status,payment_status,booking_type,room_id,service_id,therapist_id, customers(full_name,phone), services(name), therapists(full_name), rooms(name), branches(name)")
        .eq("booking_date", date)
        .eq("is_deleted", false)
        .order("start_time");
      if (branchId) q = q.eq("branch_id", branchId);
      if (therapistF !== "all") q = q.eq("therapist_id", therapistF);
      if (serviceF !== "all") q = q.eq("service_id", serviceF);
      if (statusF !== "all") q = q.eq("status", statusF as any);
      if (payF !== "all") q = q.eq("payment_status", payF as any);
      if (roomF !== "all") q = q.eq("room_id", roomF);
      if (typeF !== "all") q = q.eq("booking_type", typeF as any);
      const { data } = await q;
      const filtered = (data ?? []).filter((b: any) => !customer || b.customers?.full_name?.toLowerCase().includes(customer.toLowerCase()));
      setRows(filtered);
    })();
  }, [branchId, date, therapistF, serviceF, statusF, payF, roomF, typeF, customer]);

  const branchTherapists = branchId ? therapists.filter((t) => t.branch_id === branchId) : therapists;
  const branchRooms = branchId ? rooms.filter((r) => r.branch_id === branchId) : rooms;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Today's bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-3">
          <FilterSel value={therapistF} onChange={setTherapistF} ph="Therapist" opts={branchTherapists.map((t) => ({ v: t.id, l: t.full_name }))} />
          <FilterSel value={serviceF} onChange={setServiceF} ph="Service" opts={services.map((s) => ({ v: s.id, l: s.name }))} />
          <FilterSel value={statusF} onChange={setStatusF} ph="Status" opts={["confirmed","in_progress","completed","cancelled","no_show"].map((s) => ({ v: s, l: s.replace(/_/g," ") }))} />
          <FilterSel value={payF} onChange={setPayF} ph="Payment" opts={["unpaid","partially_paid","paid","refunded","cancelled"].map((s) => ({ v: s, l: s.replace(/_/g," ") }))} />
          <FilterSel value={roomF} onChange={setRoomF} ph="Room" opts={branchRooms.map((r) => ({ v: r.id, l: r.name }))} />
          <FilterSel value={typeF} onChange={setTypeF} ph="Type" opts={["walk_in","phone","online","repeat"].map((s) => ({ v: s, l: s.replace(/_/g," ") }))} />
          <input className="h-9 px-3 border rounded-md text-sm" placeholder="Customer..." value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </div>
        <div className="space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No bookings match.</p>}
          {rows.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
              <div>
                <div className="font-medium">{b.customers?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{b.services?.name} · {b.therapists?.full_name} · {b.rooms?.name ?? "Home"}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <StatusBadge status={b.status} />
                <StatusBadge status={b.payment_status} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSel({ value, onChange, ph, opts }: { value: string; onChange: (v: string) => void; ph: string; opts: { v: string; l: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9"><SelectValue placeholder={ph} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {ph.toLowerCase()}</SelectItem>
        {opts.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
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
