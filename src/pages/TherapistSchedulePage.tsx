import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TodayGantt } from "@/components/TodayGantt";
import { toast } from "sonner";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function TherapistSchedulePage() {
  const { selectedBranchId, branches } = useBranch();
  const { can } = useAuth();
  const branchId = selectedBranchId === "all" ? branches[0]?.id : selectedBranchId;

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [therapists, setTherapists] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [schedule, setSchedule] = useState<Record<number, any>>({});
  const [skillIds, setSkillIds] = useState<string[]>([]);

  useEffect(() => {
    if (!branchId) return;
    supabase.from("therapists").select("id,full_name,branch_id").eq("branch_id", branchId).eq("is_deleted", false).then(({ data }) => {
      setTherapists(data ?? []);
      if (data && data[0] && !selected) setSelected(data[0].id);
    });
    supabase.from("services").select("id,name").eq("is_deleted", false).then(({ data }) => setServices(data ?? []));
  }, [branchId]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const [{ data: sched }, { data: skills }] = await Promise.all([
        supabase.from("therapist_schedules").select("*").eq("therapist_id", selected),
        supabase.from("therapist_skills").select("service_id").eq("therapist_id", selected),
      ]);
      const map: Record<number, any> = {};
      (sched ?? []).forEach((s: any) => { map[s.day_of_week] = s; });
      // ensure all 7 days present
      for (let i = 0; i < 7; i++) {
        if (!map[i]) map[i] = { day_of_week: i, start_time: "10:00", end_time: "22:00", break_start: "14:00", break_end: "15:00", is_off: false };
      }
      setSchedule(map);
      setSkillIds((skills ?? []).map((s: any) => s.service_id));
    })();
  }, [selected]);

  const setDay = (d: number, patch: any) => setSchedule((s) => ({ ...s, [d]: { ...s[d], ...patch } }));

  const save = async () => {
    if (!selected) return;
    try {
      // upsert each day
      for (let d = 0; d < 7; d++) {
        const row = schedule[d];
        const payload: any = {
          therapist_id: selected,
          day_of_week: d,
          is_off: !!row.is_off,
          start_time: row.start_time, end_time: row.end_time,
          break_start: row.is_off ? null : row.break_start, break_end: row.is_off ? null : row.break_end,
        };
        if (row.id) {
          await supabase.from("therapist_schedules").update(payload).eq("id", row.id);
        } else {
          await supabase.from("therapist_schedules").insert(payload);
        }
      }
      // sync skills (delete + insert)
      await supabase.from("therapist_skills").delete().eq("therapist_id", selected);
      if (skillIds.length) {
        await supabase.from("therapist_skills").insert(skillIds.map((sid) => ({ therapist_id: selected, service_id: sid })));
      }
      toast.success("Schedule saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  return (
    <div>
      <PageHeader title="Therapist Schedule" description="Daily Gantt and weekly recurring schedule." />

      <div className="flex items-center gap-2 mb-4">
        <Label className="text-xs">Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[180px]" />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Daily schedule</CardTitle></CardHeader>
        <CardContent><TodayGantt branchId={branchId ?? null} date={date} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Weekly recurring schedule</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select therapist" /></SelectTrigger>
                <SelectContent>{therapists.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
              {can("therapists","edit") && <Button onClick={save}>Save</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selected ? <p className="text-sm text-muted-foreground">Choose a therapist.</p> : (
            <>
              <div className="space-y-2">
                {DAYS.map((d, i) => {
                  const r = schedule[i] ?? {};
                  return (
                    <div key={i} className="grid grid-cols-6 gap-2 items-center border rounded p-2">
                      <div className="font-medium text-sm">{d}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <Switch checked={!r.is_off} onCheckedChange={(v) => setDay(i, { is_off: !v })} />
                        <span>{r.is_off ? "Off" : "Working"}</span>
                      </div>
                      <Input type="time" value={r.start_time ?? ""} disabled={r.is_off} onChange={(e) => setDay(i, { start_time: e.target.value })} />
                      <Input type="time" value={r.end_time ?? ""} disabled={r.is_off} onChange={(e) => setDay(i, { end_time: e.target.value })} />
                      <Input type="time" value={r.break_start ?? ""} disabled={r.is_off} placeholder="Break start" onChange={(e) => setDay(i, { break_start: e.target.value })} />
                      <Input type="time" value={r.break_end ?? ""} disabled={r.is_off} placeholder="Break end" onChange={(e) => setDay(i, { break_end: e.target.value })} />
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <Label className="text-sm">Service skills</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {services.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm">
                      <Checkbox
                        checked={skillIds.includes(s.id)}
                        onCheckedChange={(v) => setSkillIds((cur) => v ? [...cur, s.id] : cur.filter((x) => x !== s.id))}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
