import { cn } from "@/lib/ui/cn";

// The MatList wordmark — text only (no boxed M mark), always the vivid brand
// orange, and ONE size everywhere so the brand reads identically on every
// page (30px ≈ 1.5× the old headers).
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[37.5px] font-bold leading-none tracking-tight text-brand",
        className,
      )}
    >
      MatList
    </span>
  );
}
