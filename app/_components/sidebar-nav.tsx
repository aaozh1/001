"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";

export interface SideNavItem {
  href: string;
  icon: string;
  label: string;
  /** Small count pill on the right (e.g. new RFQs). */
  badge?: number;
}

// Sidebar nav list (design handoff 2B/3G): active item gets a tinted pill —
// accent tint on the light designer sidebar, raised dark on the seller one.
export function SidebarNav({
  items,
  dark,
}: {
  items: SideNavItem[];
  dark: boolean;
}) {
  const pathname = usePathname();
  // Longest matching href wins so /designer/projects doesn't also light up /designer.
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center justify-between rounded-sm px-3 py-[11px] text-[14.5px] transition-colors",
              dark
                ? isActive
                  ? "bg-dark-3 font-semibold text-brand-bright"
                  : "font-medium text-dark-text hover:bg-dark-2 hover:text-white"
                : isActive
                  ? "bg-brand-soft font-semibold text-brand"
                  : "font-medium text-sub hover:bg-canvas-2 hover:text-ink",
            )}
          >
            <span className="flex items-center gap-[11px]">
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </span>
            {item.badge != null && item.badge > 0 && (
              <span className="rounded-pill bg-brand px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
