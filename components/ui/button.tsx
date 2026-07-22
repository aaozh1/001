import { forwardRef } from "react";
import { cn } from "@/lib/ui/cn";

export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "md" | "sm";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

// Pill button, ported from prototype `.btn` (+ .ghost / .sm / .full).
const base =
  "inline-flex items-center justify-center gap-1.5 rounded-pill font-semibold shadow-soft transition disabled:cursor-default disabled:bg-[#d6d9de] disabled:text-white disabled:shadow-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:brightness-105",
  ghost:
    "bg-surface text-ink border border-line-2 hover:border-brand hover:text-brand",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-[19px] py-[10px] text-[18.125px]",
  sm: "px-[14px] py-[7px] text-[16.875px]",
};

/** Shared class string, so links styled as buttons stay in sync (e.g. next/link CTAs). */
export function buttonClasses(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}): string {
  const { variant = "primary", size = "md", fullWidth, className } = opts ?? {};
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, fullWidth, className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    />
  ),
);
Button.displayName = "Button";
