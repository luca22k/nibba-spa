import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TherapistInput, AttendanceWindow, computeAttendanceStats } from "@/lib/recommendation";

export interface TherapistData {
  list: TherapistInput[];
  loading: boolean;
}

/**
 * Loads therapists + today's joined data + (optionally) performance & attendance windows.
 * Used by both Booking lineup and Therapist Queue.
 */
export function useTherapistData({
  branchId,
  date,
  attendanceWindow,
  performanceFromISO,
  performanceToISO,
}: {
  branchId: string | null;
  date: string;
  attendanceWindow?: AttendanceWindow;
  performanceFromISO?: string; // YYYY-MM-DD
  performanceToISO?: string;
}): TherapistData {
  const [list, setList] = useState<TherapistInput[]>([]);
  const [loading, setLoading] = useState(false);
  const winKey = JSON.stringify(attendanceWindow ?? {});

  useEffect(() => {
    if (!branchId) { setList([]); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const dow = new Date(date).getDay();
      const perfFrom = performanceFromISO ?? (() => {
        const y = new Date(date); y.setDate(y.getDate() - 1);
        return y.toISOString().slice(0, 10);
      })();
      const perfTo = performanceToISO ?? perfFrom;

      const [tRes, attTodayRes, attWinRes, schedRes, bkRes, comRes, skillRes] = await Promise.all([
        supabase.from("therapists").select("id,full_name,branch_id").eq("branch_id", branchId).eq("is_deleted", false),
        supabase.from("attendance_records").select("therapist_id,status,clock_in,clock_out").eq("date", date).eq("branch_id", branchId),
        supabase.from("attendance_records").select("therapist_id,date,status").eq("branch_id", branchId),
        supabase.from("therapist_schedules").select("therapist_id,is_off,start_time,end_time,break_start,break_end").eq("day_of_week", dow),
        supabase.from("bookings").select("therapist_id,start_time,end_time,status,is_home_service").eq("booking_date", date).eq("branch_id", branchId).eq("is_deleted", false),
        supabase.from("commissions").select("therapist_id,amount,earned_date").eq("branch_id", branchId).gte("earned_date", perfFrom).lte("earned_date", perfTo),
        supabase.from("therapist_skills").select("therapist_id,service_id"),
      ]);

      if (cancelled) return;
      const ts = (tRes.data ?? []) as any[];
      const result: TherapistInput[] = ts.map((t) => {
        const attRecs = (attWinRes.data ?? []).filter((a: any) => a.therapist_id === t.id);
        const stats = attendanceWindow
          ? computeAttendanceStats(attRecs, attendanceWindow, date)
          : undefined;
        return {
          id: t.id,
          full_name: t.full_name,
          branch_id: t.branch_id,
          attendanceToday: (attTodayRes.data ?? []).find((a: any) => a.therapist_id === t.id) ?? null,
          scheduleToday: (schedRes.data ?? []).find((s: any) => s.therapist_id === t.id) ?? null,
          bookingsToday: (bkRes.data ?? []).filter((b: any) => b.therapist_id === t.id),
          skillServiceIds: (skillRes.data ?? []).filter((s: any) => s.therapist_id === t.id).map((s: any) => s.service_id),
          performanceAmount: (comRes.data ?? []).filter((c: any) => c.therapist_id === t.id).reduce((s: number, c: any) => s + Number(c.amount), 0),
          attendanceStats: stats,
        };
      });
      setList(result);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [branchId, date, winKey, performanceFromISO, performanceToISO]);

  return { list, loading };
}
