import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CustomerLite {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

export function CustomerCombobox({
  selected,
  onSelect,
  onCreateNew,
}: {
  selected: CustomerLite | null;
  onSelect: (c: CustomerLite | null) => void;
  onCreateNew: (initialName: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CustomerLite[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q || selected) { setResults([]); return; }
    const handle = setTimeout(async () => {
      const term = q.trim();
      if (term.length < 2) { setResults([]); return; }
      const { data } = await supabase
        .from("customers")
        .select("id,full_name,phone,email")
        .eq("is_deleted", false)
        .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(8);
      setResults(data ?? []);
      setOpen(true);
    }, 200);
    return () => clearTimeout(handle);
  }, [q, selected]);

  if (selected) {
    return (
      <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/30">
        <div>
          <div className="text-sm font-medium">{selected.full_name}</div>
          <div className="text-xs text-muted-foreground">{selected.phone ?? "no phone"} {selected.email ? `· ${selected.email}` : ""}</div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>Change</Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Type customer name or phone..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => q && setOpen(true)}
          className="pl-9"
        />
      </div>
      {open && q && (
        <Card className="absolute z-20 mt-1 w-full max-h-64 overflow-auto p-1 shadow-lg">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No matches.</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onSelect(c); setQ(""); setOpen(false); }}
                className="w-full text-left p-2 hover:bg-muted rounded"
              >
                <div className="text-sm font-medium">{c.full_name}</div>
                <div className="text-xs text-muted-foreground">{c.phone ?? "—"} {c.email ? `· ${c.email}` : ""}</div>
              </button>
            ))
          )}
          <div className="border-t mt-1 pt-1">
            <button
              type="button"
              onClick={() => { onCreateNew(q); setOpen(false); }}
              className="w-full text-left p-2 hover:bg-muted rounded flex items-center gap-2 text-sm text-primary"
            >
              <UserPlus className="h-4 w-4" /> Create new customer "{q}"
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
