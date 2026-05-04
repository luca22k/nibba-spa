import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtMoney } from "@/lib/format";

export interface AddonOption { id: string; name: string; price: number; duration_minutes: number; }

export function AddonsSelector({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[], items: AddonOption[]) => void;
}) {
  const [opts, setOpts] = useState<AddonOption[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("service_addons")
        .select("id,name,price,duration_minutes")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("name");
      setOpts((data ?? []).map((d: any) => ({ ...d, price: Number(d.price) })));
    })();
  }, []);

  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(next, opts.filter((o) => next.includes(o.id)));
  };

  if (!opts.length) return <p className="text-xs text-muted-foreground">No add-ons available.</p>;

  return (
    <div className="grid grid-cols-2 gap-2">
      {opts.map((o) => {
        const checked = selectedIds.includes(o.id);
        return (
          <label key={o.id} className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer ${checked ? "border-primary bg-primary/5" : ""}`}>
            <Checkbox checked={checked} onCheckedChange={() => toggle(o.id)} />
            <div className="flex-1">
              <div className="text-sm font-medium">{o.name}</div>
              <div className="text-xs text-muted-foreground">{fmtMoney(o.price)}{o.duration_minutes ? ` · +${o.duration_minutes}m` : ""}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
