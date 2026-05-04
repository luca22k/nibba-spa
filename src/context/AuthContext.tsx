import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Feature = "bookings"|"customers"|"therapists"|"attendance"|"payments"|"reports"|"services_pricing"|"audit_log";
export type Action = "view"|"edit"|"delete";

interface PermissionRow { feature: Feature; can_view: boolean; can_edit: boolean; can_delete: boolean; }

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: "owner" | "admin" | null;
  profile: { full_name: string } | null;
  branchIds: string[]; // empty array for owner means "all"
  permissions: Record<Feature, PermissionRow> | null;
  can: (feature: Feature, action: Action) => boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ALL_FEATURES: Feature[] = ["bookings","customers","therapists","attendance","payments","reports","services_pricing","audit_log"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"owner"|"admin"|null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<Feature, PermissionRow> | null>(null);

  const loadUserData = async (u: User | null) => {
    if (!u) { setRole(null); setProfile(null); setBranchIds([]); setPermissions(null); return; }
    const [{ data: roles }, { data: prof }, { data: bas }, { data: perms }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle(),
      supabase.from("branch_admins").select("branch_id").eq("user_id", u.id),
      supabase.from("admin_permissions").select("feature,can_view,can_edit,can_delete").eq("user_id", u.id),
    ]);
    const r = roles?.find((x) => x.role === "owner") ? "owner" : (roles?.[0]?.role as "admin" | undefined) ?? null;
    setRole(r);
    setProfile(prof ?? null);
    setBranchIds((bas ?? []).map((x: any) => x.branch_id));
    const map: Record<string, PermissionRow> = {};
    (perms ?? []).forEach((p: any) => { map[p.feature] = p; });
    setPermissions(map as Record<Feature, PermissionRow>);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setTimeout(() => loadUserData(s?.user ?? null), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadUserData(data.session?.user ?? null).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const can = (feature: Feature, action: Action) => {
    if (role === "owner") return true;
    if (!permissions) return false;
    const p = permissions[feature];
    if (!p) return action === "view";
    if (action === "view") return p.can_view;
    if (action === "edit") return p.can_edit;
    return p.can_delete;
  };

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, loading, role, profile,
      branchIds, permissions, can,
      signOut: async () => { await supabase.auth.signOut(); },
      refresh: async () => loadUserData(session?.user ?? null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const FEATURES = ALL_FEATURES;
