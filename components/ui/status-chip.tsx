import { useTranslations } from "next-intl";
import { Badge } from "./badge";
import { statusVariant, type SpecStatus } from "@/lib/spec/status";

export interface StatusChipProps {
  status: SpecStatus;
  /** Optional trailing count, e.g. "Options 3" / "รอราคา 6". */
  count?: number;
}

// Domain chip for a spec line's derived status. Label comes from i18n (never
// hardcoded — CLAUDE.md), color from the status→variant map.
export function StatusChip({ status, count }: StatusChipProps) {
  const t = useTranslations("status");
  const label = t(status);
  return (
    <Badge variant={statusVariant(status)}>
      {count != null ? `${label} ${count}` : label}
    </Badge>
  );
}
