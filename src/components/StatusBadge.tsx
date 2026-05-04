import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-normal", STATUS_COLORS[status] ?? "", className)}>
      {statusLabel(status)}
    </Badge>
  );
}
