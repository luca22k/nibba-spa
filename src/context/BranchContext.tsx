import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface Branch { id: string; name: string; }

interface BranchContextValue {
  branches: Branch[];
  selectedBranchId: string | "all";
  setSelectedBranchId: (id: string | "all") => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user, role, branchIds } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selected, setSelected] = useState<string | "all">("all");

  const reload = async () => {
    if (!user) { setBranches([]); return; }
    const { data } = await supabase.from("branches").select("id,name").eq("is_deleted", false).order("name");
    setBranches(data ?? []);
    if (role !== "owner" && (data ?? []).length) {
      const allowed = (data ?? []).filter((b) => branchIds.includes(b.id));
      if (allowed[0]) setSelected(allowed[0].id);
    }
  };

  useEffect(() => { reload(); }, [user, role, branchIds.join(",")]);

  return <Ctx.Provider value={{ branches, selectedBranchId: selected, setSelectedBranchId: setSelected, reload }}>{children}</Ctx.Provider>;
}

export function useBranch() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBranch must be used inside BranchProvider");
  return ctx;
}
