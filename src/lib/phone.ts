// Philippines mobile number normalization helpers (+63 / 9XXXXXXXXX)
export function normalizeLocalPart(input: string): string {
  let v = (input ?? "").replace(/\D/g, "");
  // strip leading country code if pasted
  if (v.startsWith("63")) v = v.slice(2);
  // strip any leading zeros
  v = v.replace(/^0+/, "");
  // limit to 10 digits (9XXXXXXXXX)
  return v.slice(0, 10);
}

export function toE164(local: string): string {
  const v = normalizeLocalPart(local);
  return v ? `+63${v}` : "";
}

export function fromE164(full?: string | null): string {
  if (!full) return "";
  const v = full.replace(/\D/g, "");
  if (v.startsWith("63")) return v.slice(2);
  return v.replace(/^0+/, "");
}

export function isValidPHMobile(local: string): boolean {
  const v = normalizeLocalPart(local);
  return v.length === 10 && v.startsWith("9");
}
