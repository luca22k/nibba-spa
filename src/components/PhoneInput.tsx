import { Input } from "@/components/ui/input";
import { normalizeLocalPart } from "@/lib/phone";

export function PhoneInput({
  value,
  onChange,
  placeholder = "9XX XXX XXXX",
  disabled,
  id,
}: {
  value: string;
  onChange: (localDigits: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <div className="flex items-stretch rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
      <span className="px-3 inline-flex items-center text-sm bg-muted text-muted-foreground select-none border-r border-input">
        +63
      </span>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="tel-national"
        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(normalizeLocalPart(e.target.value))}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text");
          onChange(normalizeLocalPart(text));
        }}
      />
    </div>
  );
}
