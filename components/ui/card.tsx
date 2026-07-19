import { cn } from "@/lib/ui/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds the prototype's hover lift (translateY + deeper shadow). */
  interactive?: boolean;
  /** Apply default inner padding. Turn off when a child (e.g. Swatch) is flush. */
  padded?: boolean;
}

// Rounded, soft-shadowed surface — ported from prototype `.card`.
export function Card({
  interactive,
  padded = true,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft",
        padded && "p-[14px]",
        interactive &&
          "transition hover:-translate-y-0.5 hover:shadow-lifted",
        className,
      )}
      {...props}
    />
  );
}
