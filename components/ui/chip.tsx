import { forwardRef } from "react";
import { cn } from "@/lib/ui/cn";

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

// Toggle/filter chip — ported from prototype `.chip` (+ .on). Used for the
// category filter row in the catalog (Phase 1.4).
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ active, className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-pressed={active}
      className={cn(
        "rounded-pill border px-[14px] py-[6px] text-[16.875px] transition",
        active
          ? "border-brand bg-brand-soft font-semibold text-brand"
          : "border-line-2 bg-surface text-sub hover:border-brand hover:text-brand",
        className,
      )}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";
