// Therapist lineup ranking helpers used by Booking form and Therapist Queue page.

export type LineupBasis =
  | "performance"
  | "attendance"
  | "time_availability"
  | "rotation_fairness"
  | "current_booking_load";

export interface TherapistContext {
  id: string;
  full_name: string;
  branch_id: string | null;
  commission_rate: number;
  // joined data
  attendanceToday?: { status: string; clock_in?: string | null; clock_out?: string | null } | null;
  attendanceYesterday?: { status: string } | null;
  scheduleToday?: { is_off: boolean; start_time: string; end_time: string; break_start?: string | null; break_end?: string | null } | null;
  bookingsToday?: { start_time: string; end_time: string; status: string }[];
  yesterdayCommission?: number;
  skillServiceIds?: string[];
}

export interface RankedTherapist extends TherapistContext {
  available: boolean;
  reason?: string;
  score: number;
  bookingCount: number;
  nextFreeAt?: Date | null;
}

export function isUnavailable(t: TherapistContext): { unavailable: boolean; reason?: string } {
  const att = t.attendanceToday?.status;
  if (att === "absent" || att === "leave" || att === "off_duty") return { unavailable: true, reason: att.replace(/_/g," ") };
  if (t.scheduleToday?.is_off) return { unavailable: true, reason: "off duty" };
  if (att === "present" && t.attendanceToday?.clock_out) return { unavailable: true, reason: "clocked out" };
  return { unavailable: false };
}

function nextFreeAt(t: TherapistContext): Date | null {
  if (!t.bookingsToday?.length) return null;
  const sorted = [...t.bookingsToday]
    .filter((b) => !["cancelled","no_show"].includes(b.status))
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));
  const last = sorted[sorted.length - 1];
  return last ? new Date(last.end_time) : null;
}

export function rankTherapists(
  list: TherapistContext[],
  opts: { basis: LineupBasis; sortDir: "desc" | "asc"; serviceId?: string | null }
): RankedTherapist[] {
  const ranked: RankedTherapist[] = list.map((t) => {
    const u = isUnavailable(t);
    const bc = (t.bookingsToday ?? []).filter((b) => !["cancelled","no_show"].includes(b.status)).length;
    let score = 0;
    switch (opts.basis) {
      case "performance":
        score = (t.yesterdayCommission ?? 0);
        break;
      case "attendance":
        // present 100, late 70, leave 30, absent 0
        score = ({ present: 100, late: 70, leave: 30, absent: 0, off_duty: 0 } as any)[t.attendanceToday?.status ?? "present"] ?? 50;
        if (t.attendanceYesterday?.status === "present") score += 10;
        break;
      case "time_availability": {
        const nfa = nextFreeAt(t);
        // earlier free = higher score
        score = nfa ? -nfa.getTime() / 1000 : 1e9;
        break;
      }
      case "rotation_fairness":
        // fewer bookings today + absent yesterday boosts priority
        score = -bc * 100 + (t.attendanceYesterday?.status === "absent" ? 50 : 0);
        break;
      case "current_booking_load":
        score = -bc;
        break;
    }
    // skill match boost
    if (opts.serviceId && t.skillServiceIds?.includes(opts.serviceId)) score += 5;
    return {
      ...t,
      available: !u.unavailable && (!opts.serviceId || (t.skillServiceIds?.includes(opts.serviceId) ?? true)),
      reason: u.reason,
      score,
      bookingCount: bc,
      nextFreeAt: nextFreeAt(t),
    };
  });

  ranked.sort((a, b) => {
    // available first
    if (a.available !== b.available) return a.available ? -1 : 1;
    return opts.sortDir === "asc" ? a.score - b.score : b.score - a.score;
  });
  return ranked;
}
