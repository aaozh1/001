import { forwardRef } from "react";
import { cn } from "@/lib/ui/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

// Text input — ported from prototype `.note-input` (brand focus ring).
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-sm border border-line-2 bg-surface px-[14px] py-[10px] text-[13.5px] outline-none transition focus:border-brand focus:ring-[3px] focus:ring-brand-soft",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
