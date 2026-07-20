import { cn } from "@/lib/ui/cn";

// Loading skeletons — the page shape appears instantly while the server
// renders, so navigation feels fast instead of "blank then pop".

export function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-line", className)} />;
}

export function CardGridSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
          <Sk className="h-[110px] rounded-none" />
          <div className="flex flex-col gap-2 p-[14px]">
            <Sk className="h-4 w-3/4" />
            <Sk className="h-3 w-1/2" />
            <Sk className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-6xl">
      <Sk className="mb-2 h-7 w-40" />
      <Sk className="mb-4 h-4 w-72" />
      <Sk className="mb-5 h-11 w-full max-w-xl rounded-pill" />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <Sk key={i} className="h-7 w-24 rounded-pill" />
        ))}
      </div>
      <Sk className="mb-4 h-14 w-full rounded-card" />
      <CardGridSkeleton />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      <Sk className="mb-1 h-7 w-48" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-soft">
          <div className="flex-1">
            <Sk className="mb-2 h-4 w-1/3" />
            <Sk className="h-3 w-1/2" />
          </div>
          <Sk className="h-8 w-20 rounded-pill" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-5xl">
      <Sk className="mb-4 h-7 w-56" />
      <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
        <div className="mb-3 flex justify-between">
          <Sk className="h-5 w-32" />
          <Sk className="h-8 w-64 rounded-pill" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-3 border-t border-line py-2.5">
            <Sk className="h-4 w-14" />
            <Sk className="h-4 w-28" />
            <Sk className="h-4 w-24" />
            <Sk className="h-4 flex-1" />
            <Sk className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
