import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtTime } from "@/lib/format";

interface Therapist { id: string; full_name: string; branch_id: string | null; }
interface Booking {
  id: string; therapist_id: string | null; start_time: string; end_time: string;
  status: string; customers: { full_name: string } | null; services: { name: string } | null; rooms: { name: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-blue-500",
  in_progress: "bg-purple-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-400",
  no_show: "bg-red-500",
};

export function TodayGantt({ branchId, date }: { branchId: string | null; date: string }) {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  const reload = async () => {
    let tQ = supabase.from("therapists").select("id,full_name,branch_id").eq("is_deleted", false);
    if (branchId) tQ = tQ.eq("branch_id", branchId);
    let bQ = supabase
      .from("bookings")
      .select("id,therapist_id,start_time,end_time,status, customers(full_name), services(name), rooms(name)")
      .eq("booking_date", date)
      .eq("is_deleted", false);
    if (branchId) bQ = bQ.eq("branch_id", branchId);
    let aQ = supabase.from("attendance_records").select("therapist_id,status,clock_in,clock_out").eq("date", date);
    if (branchId) aQ = aQ.eq("branch_id", branchId);

    const dow = new Date(date).getDay();
    const sQ = supabase.from("therapist_schedules").select("therapist_id,is_off,start_time,end_time,break_start,break_end").eq("day_of_week", dow);

    const [tRes, bRes, aRes, sRes] = await Promise.all([tQ, bQ, aQ, sQ]);
    setTherapists((tRes.data ?? []) as any);
    setBookings((bRes.data ?? []) as any);
    setAttendance(aRes.data ?? []);
    setSchedules(sRes.data ?? []);
  };

  useEffect(() => { reload(); }, [branchId, date]);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel(`gantt-${date}-${branchId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [branchId, date]);

  const HOUR_START = 9;
  const HOUR_END = 23;
  const totalMin = (HOUR_END - HOUR_START) * 60;

  const pct = (d: Date) => {
    const min = d.getHours() * 60 + d.getMinutes() - HOUR_START * 60;
    return Math.max(0, Math.min(100, (min / totalMin) * 100));
  };

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) arr.push(h);
    return arr;
  }, []);

  return (
    <Card className="p-4 overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="flex border-b pb-2 ml-40">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-[10px] text-muted-foreground -ml-2">
              {h}:00
            </div>
          ))}
        </div>
        {therapists.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">No therapists in this branch.</div>
        )}
        <TooltipProvider delayDuration={150}>
          {therapists.map((t) => {
            const att = attendance.find((a) => a.therapist_id === t.id);
            const sched = schedules.find((s) => s.therapist_id === t.id);
            const tb = bookings.filter((b) => b.therapist_id === t.id);
            const offDuty = sched?.is_off || att?.status === "absent" || att?.status === "leave" || att?.status === "off_duty";
            return (
              <div key={t.id} className="flex items-stretch border-b last:border-0 py-2">
                <div className="w-40 pr-3 shrink-0">
                  <div className="text-sm font-medium truncate">{t.full_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {offDuty ? (att?.status ?? (sched?.is_off ? "off duty" : "")) : (att?.status ?? "scheduled")}
                  </div>
                </div>
                <div className="relative flex-1 h-8 bg-muted/30 rounded">
                  {/* schedule range */}
                  {sched && !sched.is_off && (
                    <div
                      className="absolute top-0 bottom-0 bg-muted"
                      style={{
                        left: `${(timeToPct(sched.start_time, HOUR_START, totalMin))}%`,
                        width: `${(timeToPct(sched.end_time, HOUR_START, totalMin)) - (timeToPct(sched.start_time, HOUR_START, totalMin))}%`,
                      }}
                    />
                  )}
                  {/* break */}
                  {sched?.break_start && sched?.break_end && (
                    <div
                      className="absolute top-0 bottom-0 bg-amber-200/60"
                      style={{
                        left: `${timeToPct(sched.break_start, HOUR_START, totalMin)}%`,
                        width: `${timeToPct(sched.break_end, HOUR_START, totalMin) - timeToPct(sched.break_start, HOUR_START, totalMin)}%`,
                      }}
                      title="Break"
                    />
                  )}
                  {offDuty && (
                    <div className="absolute inset-0 bg-red-100/60 border border-red-200 rounded flex items-center justify-center text-[10px] text-red-700">
                      {att?.status ?? "off duty"}
                    </div>
                  )}
                  {tb.map((b) => {
                    const start = new Date(b.start_time);
                    const end = new Date(b.end_time);
                    const left = pct(start);
                    const width = pct(end) - left;
                    return (
                      <Tooltip key={b.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-0.5 bottom-0.5 rounded text-[10px] text-white px-1 truncate ${STATUS_COLOR[b.status] ?? "bg-blue-500"}`}
                            style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
                          >
                            {b.customers?.full_name ?? "—"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-0.5">
                            <div className="font-medium">{b.customers?.full_name ?? "—"}</div>
                            <div>{b.services?.name}</div>
                            <div>{fmtTime(start)} – {fmtTime(end)}</div>
                            <div>Room: {b.rooms?.name ?? "Home service"}</div>
                            <div>Status: {b.status.replace(/_/g, " ")}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </div>
    </Card>
  );
}

function timeToPct(t: string, hStart: number, totalMin: number) {
  const [h, m] = t.split(":").map(Number);
  const min = h * 60 + m - hStart * 60;
  return Math.max(0, Math.min(100, (min / totalMin) * 100));
}
