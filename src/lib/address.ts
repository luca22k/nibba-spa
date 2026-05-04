import { supabase } from "@/integrations/supabase/client";

export interface PHAddress {
  region?: string | null;
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
  line1?: string | null;
  line2?: string | null;
}

export async function loadRegions() {
  const { data } = await supabase.from("ph_regions").select("id,code,name").order("name");
  return data ?? [];
}
export async function loadProvinces(regionId: string) {
  const { data } = await supabase.from("ph_provinces").select("id,code,name").eq("region_id", regionId).order("name");
  return data ?? [];
}
export async function loadCities(provinceId: string) {
  const { data } = await supabase.from("ph_cities").select("id,code,name").eq("province_id", provinceId).order("name");
  return data ?? [];
}
export async function loadBarangays(cityId: string) {
  const { data } = await supabase.from("ph_barangays").select("id,name").eq("city_id", cityId).order("name");
  return data ?? [];
}

export function formatAddress(a: PHAddress): string {
  return [a.line1, a.line2, a.barangay, a.city, a.province, a.region].filter(Boolean).join(", ");
}
