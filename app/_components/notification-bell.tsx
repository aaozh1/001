"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";

interface Item {
  id: string;
  type: string;
  payload: Record<string, string | number> | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 30_000;

// กระดิ่งแจ้งเตือน — ราคาเข้า, RFQ ใหม่, ชนะงาน, แชทใหม่ ถึงผู้ใช้โดยไม่ต้อง
// ไล่เปิดดูเองทุกหน้า
export function NotificationBell() {
  const t = useTranslations("notif");
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as { items: Item[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // Poll again next tick.
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function markAll() {
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => undefined);
  }

  async function openItem(item: Item) {
    setOpen(false);
    if (!item.read) {
      setUnread((n) => Math.max(0, n - 1));
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => undefined);
    }
    if (item.href) router.push(item.href);
  }

  function label(item: Item): string {
    const p = item.payload ?? {};
    switch (item.type) {
      case "rfq_new":
        return t("rfqNew", { count: Number(p.count ?? 1) });
      case "quote_in":
        return t("quoteIn", {
          seller: String(p.seller ?? ""),
          code: String(p.code ?? ""),
          project: String(p.project ?? ""),
        });
      case "quote_won":
        return t("quoteWon", { code: String(p.code ?? ""), project: String(p.project ?? "") });
      case "chat_new":
        return t("chatNew", { project: String(p.project ?? "") });
      case "share_feedback":
        return t("shareFb", {
          guest: String(p.guest ?? ""),
          code: String(p.code ?? ""),
          project: String(p.project ?? ""),
          kind: String(p.kind ?? "comment"),
        });
      default:
        return item.type;
    }
  }

  function timeAgo(iso: string): string {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("minsAgo", { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("hoursAgo", { n: hours });
    return t("daysAgo", { n: Math.floor(hours / 24) });
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("title")}
        aria-expanded={open}
        className="relative rounded-pill px-2 py-1 text-[21.25px] leading-none text-sub hover:text-ink"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-brand px-1 text-[12.5px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-80 rounded-card border border-line bg-surface shadow-lifted">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-sm font-semibold text-ink">{t("title")}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAll()}
                className="text-xs text-brand hover:underline"
              >
                {t("markAll")}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-sub">{t("empty")}</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openItem(item)}
                  className={cn(
                    "block w-full border-b border-line px-3 py-2.5 text-left text-sm last:border-0 hover:bg-canvas",
                    item.read ? "text-sub" : "font-medium text-ink",
                  )}
                >
                  <span className="flex items-start gap-2">
                    {!item.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    )}
                    <span className="min-w-0 flex-1">
                      {label(item)}
                      <span className="mt-0.5 block text-xs font-normal text-mut">
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
