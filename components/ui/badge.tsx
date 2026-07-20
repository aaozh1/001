import { cn } from "@/lib/ui/cn";
import type { BadgeVariant } from "@/lib/spec/status";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant | "brand";
}

// Small status pill — ported from prototype `.status` + `.s-*` colors.
const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral: "bg-canvas text-mut",
  warn: "bg-warn-soft text-warn",
  ok: "bg-ok-soft text-ok",
  info: "bg-info-soft text-info",
  quoted: "bg-quoted-soft text-quoted",
  brand: "bg-brand-soft text-brand",
};

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-pill px-[11px] py-[4px] text-[12px] font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
