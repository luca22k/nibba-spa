export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  no_show: "bg-red-100 text-red-800 border-red-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  unpaid: "bg-yellow-100 text-yellow-800 border-yellow-200",
  partially_paid: "bg-orange-100 text-orange-800 border-orange-200",
  refunded: "bg-gray-100 text-gray-700 border-gray-200",
  present: "bg-green-100 text-green-800 border-green-200",
  absent: "bg-red-100 text-red-800 border-red-200",
  late: "bg-yellow-100 text-yellow-800 border-yellow-200",
  leave: "bg-blue-100 text-blue-800 border-blue-200",
  off_duty: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
  on_leave: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtMoney(n: number | string | null | undefined) {
  const x = Number(n ?? 0);
  return "₱" + x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString();
}

export function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
