import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranch } from "@/context/BranchContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { rankTherapists, type LineupBasis, type TherapistContext } from "@/lib/lineup";
import { fmtMoney } from "@/lib/format";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function TherapistQueue() {
  const { selectedBranchId, branches } = useBranch();
  const branchId = selectedBranchId === "all" ? branches[0]?.id : selectedBranchId;

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [basis, setBasis] = useState<LineupBasis>("rotation_fairness");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [services, setServices] = useState<any[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all"); // all / available / unavailable
  const [attendanceFilter, setAttendanceFilter] = useState<string>("all");

  const [list, setList] = useState<TherapistContext[]>([]);

  useEffect(() => {
    supabase.from("services").select("id,name").eq("is_deleted", false).then(({ data }) => setServices(data ?? []));
  }, []);

  useEffect(() => {
    if (!branchId) { setList([]); return; }
    (async () => {
      const yest = new Date(date); yest.setDate(yest.getDate() - 1);
      const yIso = yest.toISOString().slice(0, 10);
      const dow = new Date(date).getDay();
      const [tRes, attRes, attYRes, schedRes, bkRes, comRes, skillRes] = await Promise.all([
        supabase.from("therapists").select("id,full_name,branch_id,commission_rate").eq("branch_id", branchId).eq("is_deleted", false),
        supabase.from("attendance_records").select("therapist_id,status,clock_in,clock_out").eq("date", date).eq("branch_id", branchId),
        supabase.from("attendance_records").select("therapist_id,status").eq("date", yIso).eq("branch_id", branchId),
        supabase.from("therapist_schedules").select("therapist_id,is_off,start_time,end_time,break_start,break_end").eq("day_of_week", dow),
        supabase.from("bookings").select("therapist_id,start_time,end_time,status").eq("booking_date", date).eq("branch_id", branchId).eq("is_deleted", false),
        supabase.from("commissions").select("therapist_id,amount").eq("earned_date", yIso).eq("branch_id", branchId),
        supabase.from("therapist_skills").select("therapist_id,service_id"),
      ]);
      const ts = (tRes.data ?? []) as any[];
      setList(ts.map((t) => ({
        id: t.id, full_name: t.full_name, branch_id: t.branch_id, commission_rate: Number(t.commission_rate),
        attendanceToday: (attRes.data ?? []).find((a: any) => a.therapist_id === t.id) ?? null,
        attendanceYesterday: (attYRes.data ?? []).find((a: any) => a.therapist_id === t.id) ?? null,
        scheduleToday: (schedRes.data ?? []).find((s: any) => s.therapist_id === t.id) ?? null,
        bookingsToday: (bkRes.data ?? []).filter((b: any) => b.therapist_id === t.id),
        yesterdayCommission: (comRes.data ?? []).filter((c: any) => c.therapist_id === t.id).reduce((s: number, c: any) => s + Number(c.amount), 0),
        skillServiceIds: (skillRes.data ?? []).filter((s: any) => s.therapist_id === t.id).map((s: any) => s.service_id),
      })));
    })();
  }, [branchId, date]);

  const ranked = useMemo(
    () => rankTherapists(list, { basis, sortDir, serviceId: serviceFilter === "all" ? null : serviceFilter }),
    [list, basis, sortDir, serviceFilter]
  );

  const filtered = ranked.filter((t) => {
    if (availabilityFilter === "available" && !t.available) return false;
    if (availabilityFilter === "unavailable" && t.available) return false;
    if (attendanceFilter !== "all" && (t.attendanceToday?.status ?? "present") !== attendanceFilter) return false;
    return true;
  });

  const chartData = filtered.map((t) => ({ name: t.full_name.split(" ")[0], value: t.yesterdayCommission ?? 0 }));

  return (
    <div>
      <PageHeader title="Therapist Queue" description="Recommended lineup for the next bookings." />

      <Card className="p-4 mb-4 grid gap-2 lg:grid-cols-6">
        <div>
          <label className="text-xs text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Recommend based on</label>
          <Select value={basis} onValueChange={(v) => setBasis(v as LineupBasis)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="attendance">Attendance</SelectItem>
              <SelectItem value="time_availability">Time Availability</SelectItem>
              <SelectItem value="rotation_fairness">Rotation Fairness</SelectItem>
              <SelectItem value="current_booking_load">Current Booking Load</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Sort order</label>
          <Select value={sortDir} onValueChange={(v) => setSortDir(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Highest to Lowest</SelectItem>
              <SelectItem value="asc">Lowest to Highest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Service</label>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Availability</label>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available only</SelectItem>
              <SelectItem value="unavailable">Unavailable only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Attendance</label>
          <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid gap-2">
          {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">No therapists.</Card>}
          {filtered.map((t, i) => (
            <Card key={t.id} className={`p-3 ${!t.available ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  #{i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{t.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.bookingCount} bookings today · {fmtMoney(t.yesterdayCommission ?? 0)} yesterday
                    {t.nextFreeAt ? ` · free after ${t.nextFreeAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </div>
                  <AvailabilityStrip therapist={t} date={date} />
                </div>
                {t.available
                  ? <Badge>Available</Badge>
                  : <Badge variant="outline">{t.reason ?? "unavailable"}</Badge>}
              </div>
            </Card>
          ))}
        </div>
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Yesterday's commission</CardTitle></CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
              <ResponsiveContainer>
                <BarChart data={chartData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="name" type="category" fontSize={11} width={80} />
                  <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AvailabilityStrip({ therapist, date }: { therapist: TherapistContext; date: string }) {
  const HOUR_START = 9, HOUR_END = 23;
  const totalMin = (HOUR_END - HOUR_START) * 60;
  const pct = (d: Date) => {
    const min = d.getHours() * 60 + d.getMinutes() - HOUR_START * 60;
    return Math.max(0, Math.min(100, (min / totalMin) * 100));
  };
  return (
    <div className="relative h-2 mt-2 bg-muted rounded">
      {(therapist.bookingsToday ?? []).map((b, i) => {
        const s = new Date(b.start_time), e = new Date(b.end_time);
        const left = pct(s), width = pct(e) - left;
        return <div key={i} className="absolute top-0 bottom-0 bg-primary rounded" style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }} />;
      })}
    </div>
  );
}
