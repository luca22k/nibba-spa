import { useMemo, useState } from "react";
import { useBranch } from "@/context/BranchContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rankTherapists, defaultSortFor, type RecommendBasis, type TherapistInput } from "@/lib/recommendation";
import { RecommendationControls, RecommendState } from "@/components/booking/RecommendationControls";
import { useTherapistData } from "@/hooks/useTherapistData";
import { fmtMoney } from "@/lib/format";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function TherapistQueue() {
  const { selectedBranchId, branches } = useBranch();
  const branchId = selectedBranchId === "all" ? branches[0]?.id : selectedBranchId;

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const initialBasis: RecommendBasis = "rotation_fairness";
  const [state, setState] = useState<RecommendState>({
    basis: initialBasis,
    sort: defaultSortFor(initialBasis),
    attendanceRange: "this_week",
  });
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");

  const attendanceWindow = state.basis === "attendance" ? {
    range: state.attendanceRange,
    fromDate: state.customFrom,
    toDate: state.customTo,
  } : undefined;

  const { list } = useTherapistData({ branchId: branchId ?? null, date, attendanceWindow });

  const ranked = useMemo(
    () => rankTherapists(list, {
      basis: state.basis, sort: state.sort,
      serviceId: serviceFilter === "all" ? null : serviceFilter,
    }),
    [list, state.basis, state.sort, serviceFilter]
  );

  const filtered = ranked.filter((t) => {
    if (availabilityFilter === "available" && !t.available) return false;
    if (availabilityFilter === "unavailable" && t.available) return false;
    return true;
  });

  const chartData = filtered.map((t) => ({ name: t.full_name.split(" ")[0], value: t.performanceAmount ?? 0 }));

  return (
    <div>
      <PageHeader title="Therapist Queue" description="Recommended lineup for next bookings." />

      <Card className="p-4 mb-4 space-y-3">
        <div className="grid gap-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Availability</Label>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available only</SelectItem>
                <SelectItem value="unavailable">Unavailable only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <RecommendationControls value={state} onChange={setState} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid gap-2">
          {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">No therapists.</Card>}
          {filtered.map((t) => (
            <Card key={t.id} className={`p-3 ${!t.available ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  #{t.rank}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{t.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.bookingCount} bookings today · {t.scoreLabel}
                  </div>
                  <AvailabilityStrip therapist={t} />
                </div>
                {t.available
                  ? <Badge>Available</Badge>
                  : <Badge variant="outline">{t.reason ?? "unavailable"}</Badge>}
              </div>
            </Card>
          ))}
        </div>
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Performance</CardTitle></CardHeader>
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

function AvailabilityStrip({ therapist }: { therapist: TherapistInput }) {
  const HOUR_START = 9, HOUR_END = 23;
  const totalMin = (HOUR_END - HOUR_START) * 60;
  const pct = (d: Date) => Math.max(0, Math.min(100, ((d.getHours() * 60 + d.getMinutes() - HOUR_START * 60) / totalMin) * 100));
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
