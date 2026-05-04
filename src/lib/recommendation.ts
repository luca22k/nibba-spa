// Shared therapist recommendation engine used by Booking form and Therapist Queue.
// Single source of truth for ranking logic.

export type RecommendBasis =
  | "performance"
  | "rotation_fairness"
  | "attendance"
  | "time_availability"
  | "current_booking_load";

export type SortOption =
  // performance / attendance / load
  | "high_to_low"
  | "low_to_high"
  // rotation fairness
  | "next_available_first"
  | "longest_waiting_first"
  | "earliest_return_first"
  // time availability
  | "earliest_available_first"
  | "latest_available_first"
  | "available_now_first";

export type AttendanceRange = "yesterday" | "this_week" | "all_time" | "custom";

export interface AttendanceWindow {
  range: AttendanceRange;
  fromDate?: string; // YYYY-MM-DD (custom)
  toDate?: string;
}

export interface TherapistInput {
  id: string;
  full_name: string;
  branch_id: string | null;
  // joined daily data
  attendanceToday?: { status: string; clock_in?: string | null; clock_out?: string | null } | null;
  scheduleToday?: { is_off: boolean; start_time: string; end_time: string; break_start?: string | null; break_end?: string | null } | null;
  bookingsToday?: { start_time: string; end_time: string; status: string; is_home_service?: boolean }[];
  skillServiceIds?: string[];
  // performance
  performanceAmount?: number; // commission/sales over chosen window
  // attendance window stats
  attendanceStats?: {
    presentDays: number;
    lateDays: number;
    absentDays: number;
    leaveDays: number;
    totalDays: number;
  };
}

export interface RankedTherapist extends TherapistInput {
  rank: number;
  available: boolean;
  reason?: string;
  bookingCount: number;
  nextFreeAt: Date | null;
  attendanceScore: number; // 0-100
  loadCount: number;
  rotationScore: number;
  scoreLabel: string;
}

export const SORTS_BY_BASIS: Record<RecommendBasis, { value: SortOption; label: string }[]> = {
  performance: [
    { value: "high_to_low", label: "Highest to Lowest" },
    { value: "low_to_high", label: "Lowest to Highest" },
  ],
  rotation_fairness: [
    { value: "next_available_first", label: "Next Available First" },
    { value: "longest_waiting_first", label: "Longest Waiting First" },
    { value: "earliest_return_first", label: "Earliest Return First (Home Service)" },
  ],
  attendance: [
    { value: "high_to_low", label: "Highest to Lowest" },
    { value: "low_to_high", label: "Lowest to Highest" },
  ],
  time_availability: [
    { value: "earliest_available_first", label: "Earliest Available First" },
    { value: "latest_available_first", label: "Latest Available First" },
    { value: "available_now_first", label: "Available Now First" },
  ],
  current_booking_load: [
    { value: "high_to_low", label: "Highest to Lowest" },
    { value: "low_to_high", label: "Lowest to Highest" },
  ],
};

export function defaultSortFor(basis: RecommendBasis, isHomeService = false): SortOption {
  if (basis === "rotation_fairness") {
    return isHomeService ? "earliest_return_first" : "next_available_first";
  }
  return SORTS_BY_BASIS[basis][0].value;
}

export function isUnavailableReason(t: TherapistInput): { unavailable: boolean; reason?: string } {
  const status = t.attendanceToday?.status;
  if (status === "absent" || status === "leave" || status === "off_duty") {
    return { unavailable: true, reason: status.replace(/_/g, " ") };
  }
  if (t.scheduleToday?.is_off) return { unavailable: true, reason: "off duty" };
  if (status === "present" && t.attendanceToday?.clock_out) return { unavailable: true, reason: "clocked out" };
  if (!t.attendanceToday?.clock_in && status !== "late") return { unavailable: true, reason: "not clocked in" };
  return { unavailable: false };
}

function lastBookingEnd(t: TherapistInput): Date | null {
  const sorted = (t.bookingsToday ?? [])
    .filter((b) => !["cancelled", "no_show"].includes(b.status))
    .sort((a, b) => +new Date(a.end_time) - +new Date(b.end_time));
  return sorted.length ? new Date(sorted[sorted.length - 1].end_time) : null;
}

function loadCount(t: TherapistInput): number {
  return (t.bookingsToday ?? []).filter((b) => !["cancelled", "no_show"].includes(b.status)).length;
}

function attendanceScore(t: TherapistInput): number {
  const s = t.attendanceStats;
  if (!s || s.totalDays === 0) return 50;
  const score = (s.presentDays * 100 + s.lateDays * 60 + s.leaveDays * 30) / s.totalDays;
  return Math.round(score);
}

export function rankTherapists(
  list: TherapistInput[],
  opts: {
    basis: RecommendBasis;
    sort: SortOption;
    serviceId?: string | null;
    isHomeService?: boolean;
    now?: Date;
  }
): RankedTherapist[] {
  const now = opts.now ?? new Date();

  const ranked: RankedTherapist[] = list.map((t) => {
    const u = isUnavailableReason(t);
    const skillOk = !opts.serviceId || (t.skillServiceIds?.includes(opts.serviceId) ?? false);
    const lc = loadCount(t);
    const nfa = lastBookingEnd(t);
    return {
      ...t,
      rank: 0,
      available: !u.unavailable && skillOk,
      reason: u.unavailable ? u.reason : (!skillOk ? "no skill match" : undefined),
      bookingCount: lc,
      loadCount: lc,
      nextFreeAt: nfa,
      attendanceScore: attendanceScore(t),
      rotationScore: -lc, // fewer bookings = higher rotation priority
      scoreLabel: "",
    };
  });

  const cmp = (a: RankedTherapist, b: RankedTherapist): number => {
    // available first
    if (a.available !== b.available) return a.available ? -1 : 1;

    switch (opts.basis) {
      case "performance": {
        const av = a.performanceAmount ?? 0;
        const bv = b.performanceAmount ?? 0;
        return opts.sort === "low_to_high" ? av - bv : bv - av;
      }
      case "attendance": {
        return opts.sort === "low_to_high"
          ? a.attendanceScore - b.attendanceScore
          : b.attendanceScore - a.attendanceScore;
      }
      case "current_booking_load": {
        return opts.sort === "low_to_high" ? a.loadCount - b.loadCount : b.loadCount - a.loadCount;
      }
      case "time_availability": {
        const at = a.nextFreeAt?.getTime() ?? now.getTime();
        const bt = b.nextFreeAt?.getTime() ?? now.getTime();
        if (opts.sort === "available_now_first") {
          // those with no upcoming booking come first, then earliest
          if (!a.nextFreeAt && b.nextFreeAt) return -1;
          if (a.nextFreeAt && !b.nextFreeAt) return 1;
          return at - bt;
        }
        return opts.sort === "latest_available_first" ? bt - at : at - bt;
      }
      case "rotation_fairness": {
        const aEnd = a.nextFreeAt?.getTime() ?? now.getTime();
        const bEnd = b.nextFreeAt?.getTime() ?? now.getTime();
        if (opts.sort === "longest_waiting_first") {
          return aEnd - bEnd; // earliest finished = longest waiting
        }
        if (opts.sort === "earliest_return_first") {
          // For Home Service, factor return-to-base buffer (~30 min) for HS bookings
          const buf = (t: RankedTherapist) => {
            const lastHs = (t.bookingsToday ?? [])
              .filter((b) => b.is_home_service && !["cancelled", "no_show"].includes(b.status))
              .sort((x, y) => +new Date(y.end_time) - +new Date(x.end_time))[0];
            return lastHs ? new Date(lastHs.end_time).getTime() + 30 * 60_000 : (t.nextFreeAt?.getTime() ?? now.getTime());
          };
          return buf(a) - buf(b);
        }
        // next_available_first (default)
        // primary: fewer bookings; secondary: earlier next-free
        if (a.loadCount !== b.loadCount) return a.loadCount - b.loadCount;
        return aEnd - bEnd;
      }
    }
  };

  ranked.sort(cmp);
  ranked.forEach((r, i) => {
    r.rank = i + 1;
    r.scoreLabel = labelFor(r, opts.basis);
  });
  return ranked;
}

function labelFor(t: RankedTherapist, basis: RecommendBasis): string {
  switch (basis) {
    case "performance": return `₱${(t.performanceAmount ?? 0).toLocaleString()}`;
    case "attendance": return `${t.attendanceScore}/100`;
    case "current_booking_load": return `${t.loadCount} bookings`;
    case "time_availability":
      return t.nextFreeAt ? `free ${t.nextFreeAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "free now";
    case "rotation_fairness":
      return `${t.loadCount} today` + (t.nextFreeAt ? ` · ${t.nextFreeAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "");
  }
}

// Helper to compute attendance stats over a window
export function computeAttendanceStats(
  records: { date: string; status: string }[],
  win: AttendanceWindow,
  todayISO: string,
): { presentDays: number; lateDays: number; absentDays: number; leaveDays: number; totalDays: number } {
  const today = new Date(todayISO);
  let from: Date | null = null;
  let to: Date | null = today;
  if (win.range === "yesterday") {
    from = new Date(today); from.setDate(from.getDate() - 1);
    to = new Date(from);
  } else if (win.range === "this_week") {
    from = new Date(today); from.setDate(today.getDate() - today.getDay()); // Sunday
  } else if (win.range === "custom" && win.fromDate) {
    from = new Date(win.fromDate);
    to = win.toDate ? new Date(win.toDate) : today;
  }

  const inRange = records.filter((r) => {
    if (!from || !to) return true;
    const d = new Date(r.date);
    return d >= from && d <= to;
  });

  const stats = { presentDays: 0, lateDays: 0, absentDays: 0, leaveDays: 0, totalDays: inRange.length };
  inRange.forEach((r) => {
    if (r.status === "present") stats.presentDays++;
    else if (r.status === "late") stats.lateDays++;
    else if (r.status === "absent") stats.absentDays++;
    else if (r.status === "leave") stats.leaveDays++;
  });
  return stats;
}
