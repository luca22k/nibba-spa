import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { rankTherapists, RecommendBasis, SortOption, AttendanceRange, defaultSortFor } from "@/lib/recommendation";
import { RecommendationControls, RecommendState } from "./RecommendationControls";
import { useTherapistData } from "@/hooks/useTherapistData";

export function TherapistLineupPanel({
  branchId,
  serviceId,
  date,
  isHomeService,
  selectedId,
  onSelect,
}: {
  branchId: string | null;
  serviceId: string | null;
  date: string;
  isHomeService?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const initialBasis: RecommendBasis = "rotation_fairness";
  const [state, setState] = useState<RecommendState>({
    basis: initialBasis,
    sort: defaultSortFor(initialBasis, isHomeService),
    attendanceRange: "this_week",
  });

  const attendanceWindow = state.basis === "attendance" ? {
    range: state.attendanceRange,
    fromDate: state.customFrom,
    toDate: state.customTo,
  } : undefined;

  const { list } = useTherapistData({ branchId, date, attendanceWindow });

  const ranked = useMemo(
    () => rankTherapists(list, { basis: state.basis, sort: state.sort, serviceId, isHomeService }),
    [list, state.basis, state.sort, serviceId, isHomeService]
  );

  return (
    <div className="space-y-3">
      <RecommendationControls value={state} onChange={setState} isHomeService={isHomeService} compact />
      {!branchId && <p className="text-xs text-muted-foreground">Pick a branch to see therapist lineup.</p>}
      {branchId && ranked.length === 0 && <p className="text-xs text-muted-foreground">No therapists in this branch.</p>}
      <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
        {ranked.map((t) => {
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
                <div className="text-xs font-mono text-muted-foreground w-6">#{t.rank}</div>
                <div>
                  <div className="text-sm font-medium">{t.full_name}</div>
                  <div className="text-xs text-muted-foreground">{t.scoreLabel}</div>
                </div>
              </div>
              {t.available
                ? <Badge variant="secondary">Available</Badge>
                : <Badge variant="outline">{t.reason ?? "unavailable"}</Badge>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
