"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";

interface Entry {
  key: string;
  icon: string;
  label: string;
  hint?: string;
  href: string;
}

// Command palette (Ctrl/Cmd+K) — jump to any page, project or material from
// anywhere in the workspace.
export function CommandPalette({ workspace }: { workspace: "designer" | "seller" }) {
  const t = useTranslations("palette");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [dynamic, setDynamic] = useState<Entry[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const NAV: Entry[] =
    workspace === "designer"
      ? [
          { key: "nav-dash", icon: "🏠", label: t("navDashboard"), href: "/designer" },
          { key: "nav-projects", icon: "📁", label: t("navProjects"), href: "/designer/projects" },
          { key: "nav-catalog", icon: "🧱", label: t("navCatalog"), href: "/designer/catalog" },
          { key: "nav-library", icon: "🗂", label: t("navLibrary"), href: "/designer/library" },
          { key: "nav-chat", icon: "💬", label: t("navChat"), href: "/designer/chat" },
          { key: "nav-billing", icon: "💳", label: t("navBilling"), href: "/designer/billing" },
          { key: "act-new", icon: "＋", label: t("actNewProject"), href: "/designer/projects" },
          { key: "act-import", icon: "⬆", label: t("actImport"), href: "/designer/projects/import" },
        ]
      : [
          { key: "nav-dash", icon: "🏠", label: t("navDashboard"), href: "/seller" },
          { key: "nav-rfq", icon: "📨", label: t("navRfq"), href: "/seller/rfq" },
          { key: "nav-materials", icon: "🧱", label: t("navMaterials"), href: "/seller/materials" },
          { key: "nav-import", icon: "⬆", label: t("actImportProducts"), href: "/seller/materials/import" },
          { key: "nav-performance", icon: "📈", label: t("navPerformance"), href: "/seller/performance" },
          { key: "nav-team", icon: "👥", label: t("navTeam"), href: "/seller/team" },
          { key: "nav-chat", icon: "💬", label: t("navChat"), href: "/seller/chat" },
        ];

  // Global hotkey.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
        setDynamic([]);
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Debounced dynamic search: projects (designer) + catalog materials.
  const search = useCallback(
    async (query: string) => {
      const mySeq = ++seq.current;
      const results: Entry[] = [];
      try {
        const jobs: Promise<void>[] = [];
        if (workspace === "designer") {
          jobs.push(
            fetch("/api/projects")
              .then((r) => (r.ok ? r.json() : null))
              .then((d: { projects?: { id: string; name: string }[] } | null) => {
                for (const p of d?.projects ?? []) {
                  if (p.name.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                      key: `p-${p.id}`,
                      icon: "📁",
                      label: p.name,
                      hint: t("hintProject"),
                      href: `/designer/projects/${p.id}`,
                    });
                  }
                }
              })
              .catch(() => undefined),
          );
        }
        jobs.push(
          fetch(`/api/materials?q=${encodeURIComponent(query)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then(
              (d: { materials?: { id: string; nameTh: string; brand: string | null }[] } | null) => {
                for (const m of (d?.materials ?? []).slice(0, 6)) {
                  results.push({
                    key: `m-${m.id}`,
                    icon: "🧱",
                    label: m.nameTh,
                    hint: m.brand ?? t("hintMaterial"),
                    href:
                      workspace === "designer"
                        ? `/designer/catalog/${m.id}`
                        : `/catalog/${m.id}`,
                  });
                }
              },
            )
            .catch(() => undefined),
        );
        await Promise.all(jobs);
      } finally {
        if (seq.current === mySeq) setDynamic(results);
      }
    },
    [workspace, t],
  );

  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 2) {
      setDynamic([]);
      return;
    }
    const handle = setTimeout(() => void search(query), 220);
    return () => clearTimeout(handle);
  }, [q, open, search]);

  const filteredNav = NAV.filter(
    (e) => !q.trim() || e.label.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const entries = [...filteredNav, ...dynamic].slice(0, 12);

  function go(entry: Entry) {
    setOpen(false);
    router.push(entry.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(entries.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && entries[active]) {
      e.preventDefault();
      go(entries[active]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 p-4 pt-[12vh]"
      onMouseDown={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-card border border-line bg-surface shadow-lifted"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <span className="text-sub">🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="w-full bg-transparent py-3 text-sm text-ink outline-none"
          />
          <kbd className="rounded-sm border border-line-2 px-1.5 py-0.5 text-[10px] text-mut">esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {entries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-sub">{t("noResults")}</p>
          ) : (
            entries.map((entry, i) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => go(entry)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                  i === active ? "bg-brand-soft text-ink" : "text-sub",
                )}
              >
                <span>{entry.icon}</span>
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                {entry.hint && <span className="text-xs text-mut">{entry.hint}</span>}
              </button>
            ))
          )}
        </div>
        <div className="border-t border-line px-4 py-1.5 text-[11px] text-mut">
          ↑↓ {t("kbNav")} · ⏎ {t("kbOpen")} · Ctrl+K
        </div>
      </div>
    </div>
  );
}
