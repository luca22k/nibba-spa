import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rankTherapists, type TherapistContext } from "@/lib/lineup";

export function TherapistLineupPanel({
  branchId,
  serviceId,
  date,
  selectedId,
  onSelect,
}: {
  branchId: string | null;
  serviceId: string | null;
  date: string; // YYYY-MM-DD
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [list, setList] = useState<TherapistContext[]>([]);

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
      const result: TherapistContext[] = ts.map((t) => ({
        id: t.id,
        full_name: t.full_name,
        branch_id: t.branch_id,
        commission_rate: Number(t.commission_rate),
        attendanceToday: (attRes.data ?? []).find((a: any) => a.therapist_id === t.id) ?? null,
        attendanceYesterday: (attYRes.data ?? []).find((a: any) => a.therapist_id === t.id) ?? null,
        scheduleToday: (schedRes.data ?? []).find((s: any) => s.therapist_id === t.id) ?? null,
        bookingsToday: (bkRes.data ?? []).filter((b: any) => b.therapist_id === t.id),
        yesterdayCommission: (comRes.data ?? []).filter((c: any) => c.therapist_id === t.id).reduce((s: number, c: any) => s + Number(c.amount), 0),
        skillServiceIds: (skillRes.data ?? []).filter((s: any) => s.therapist_id === t.id).map((s: any) => s.service_id),
      }));
      setList(result);
    })();
  }, [branchId, date]);

  const ranked = rankTherapists(list, { basis: "rotation_fairness", sortDir: "desc", serviceId: serviceId ?? null });

  if (!branchId) return <p className="text-xs text-muted-foreground">Pick a branch to see therapist lineup.</p>;
  if (!ranked.length) return <p className="text-xs text-muted-foreground">No therapists in this branch.</p>;

  return (
    <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
      {ranked.map((t, i) => {
        const isSel = t.id === selectedId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => t.available && onSelect(t.id)}
            disabled={!t.available}
            className={`w-full text-left flex items-center justify-between border rounded-md px-3 py-2 transition ${
              isSel ? "border-primary bg-primary/5" : ""
            } ${!t.available ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}`}
          >
            <div className="flex items-center gap-3">
              <div className="text-xs font-mono text-muted-foreground w-6">#{i + 1}</div>
              <div>
                <div className="text-sm font-medium">{t.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.bookingCount} bookings today
                  {t.nextFreeAt ? ` · free after ${t.nextFreeAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                </div>
              </div>
            </div>
            {t.available ? (
              <Badge variant="secondary">Available</Badge>
            ) : (
              <Badge variant="outline">{t.reason ?? "unavailable"}</Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
