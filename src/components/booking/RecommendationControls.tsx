import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RecommendBasis, SortOption, AttendanceRange, SORTS_BY_BASIS, defaultSortFor } from "@/lib/recommendation";

export interface RecommendState {
  basis: RecommendBasis;
  sort: SortOption;
  attendanceRange: AttendanceRange;
  customFrom?: string;
  customTo?: string;
}

export function RecommendationControls({
  value,
  onChange,
  isHomeService,
  compact,
}: {
  value: RecommendState;
  onChange: (next: RecommendState) => void;
  isHomeService?: boolean;
  compact?: boolean;
}) {
  const sortOpts = SORTS_BY_BASIS[value.basis];

  const setBasis = (b: RecommendBasis) =>
    onChange({ ...value, basis: b, sort: defaultSortFor(b, isHomeService) });

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-2 lg:grid-cols-4"}>
      <div>
        <Label className="text-xs">Recommend based on</Label>
        <Select value={value.basis} onValueChange={(v) => setBasis(v as RecommendBasis)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="rotation_fairness">Rotation Fairness</SelectItem>
            <SelectItem value="attendance">Attendance</SelectItem>
            <SelectItem value="time_availability">Time Availability</SelectItem>
            <SelectItem value="current_booking_load">Current Booking Load</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Sorting order</Label>
        <Select value={value.sort} onValueChange={(v) => onChange({ ...value, sort: v as SortOption })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {sortOpts.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {value.basis === "attendance" && (
        <>
          <div>
            <Label className="text-xs">Attendance range</Label>
            <Select value={value.attendanceRange} onValueChange={(v) => onChange({ ...value, attendanceRange: v as AttendanceRange })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This week</SelectItem>
                <SelectItem value="all_time">All time</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {value.attendanceRange === "custom" && (
            <div className="flex gap-1 items-end">
              <div className="flex-1">
                <Label className="text-xs">From</Label>
                <Input type="date" className="h-9" value={value.customFrom ?? ""} onChange={(e) => onChange({ ...value, customFrom: e.target.value })} />
              </div>
              <div className="flex-1">
                <Label className="text-xs">To</Label>
                <Input type="date" className="h-9" value={value.customTo ?? ""} onChange={(e) => onChange({ ...value, customTo: e.target.value })} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
