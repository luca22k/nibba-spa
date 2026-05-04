import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadBarangays, loadCities, loadProvinces, loadRegions, PHAddress } from "@/lib/address";

interface Opt { id: string; name: string; }

export function PHAddressFields({
  value,
  onChange,
}: {
  value: PHAddress;
  onChange: (next: PHAddress) => void;
}) {
  const [regions, setRegions] = useState<Opt[]>([]);
  const [provinces, setProvinces] = useState<Opt[]>([]);
  const [cities, setCities] = useState<Opt[]>([]);
  const [barangays, setBarangays] = useState<Opt[]>([]);
  const [regionId, setRegionId] = useState<string>("");
  const [provinceId, setProvinceId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");

  useEffect(() => { loadRegions().then(setRegions); }, []);
  useEffect(() => { regionId ? loadProvinces(regionId).then(setProvinces) : setProvinces([]); setProvinceId(""); setCityId(""); setCities([]); setBarangays([]); }, [regionId]);
  useEffect(() => { provinceId ? loadCities(provinceId).then(setCities) : setCities([]); setCityId(""); setBarangays([]); }, [provinceId]);
  useEffect(() => { cityId ? loadBarangays(cityId).then(setBarangays) : setBarangays([]); }, [cityId]);

  const set = (patch: Partial<PHAddress>) => onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">Region</Label>
        <Select value={regionId} onValueChange={(v) => { setRegionId(v); set({ region: regions.find((r) => r.id === v)?.name ?? null, province: null, city: null, barangay: null }); }}>
          <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
          <SelectContent>{regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Province</Label>
        <Select value={provinceId} onValueChange={(v) => { setProvinceId(v); set({ province: provinces.find((p) => p.id === v)?.name ?? null, city: null, barangay: null }); }} disabled={!regionId}>
          <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
          <SelectContent>{provinces.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">City / Municipality</Label>
        <Select value={cityId} onValueChange={(v) => { setCityId(v); set({ city: cities.find((c) => c.id === v)?.name ?? null, barangay: null }); }} disabled={!provinceId}>
          <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
          <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Barangay</Label>
        <Select value={value.barangay ?? ""} onValueChange={(v) => set({ barangay: v })} disabled={!cityId}>
          <SelectTrigger><SelectValue placeholder="Select barangay" /></SelectTrigger>
          <SelectContent>{barangays.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Label className="text-xs">Address Line 1</Label>
        <Input value={value.line1 ?? ""} onChange={(e) => set({ line1: e.target.value })} placeholder="Street, building" />
      </div>
      <div className="col-span-2">
        <Label className="text-xs">Address Line 2</Label>
        <Input value={value.line2 ?? ""} onChange={(e) => set({ line2: e.target.value })} placeholder="Floor, unit (optional)" />
      </div>
    </div>
  );
}
