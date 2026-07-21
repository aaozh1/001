"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";
import { sendRfqsAction } from "@/lib/rfq/actions";
import type { SpecRow } from "./types";

// ขอราคา/ตัวอย่าง — driven by the rows ticked in the Material List (no more
// separate section). The modal confirms deadline/note/sample then sends.
export function RfqSendModal({
  open,
  onClose,
  projectId,
  items,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  items: SpecRow[];
  onSent: () => void;
}) {
  const t = useTranslations("rfq");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [wantSample, setWantSample] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sendError, setSendError] = useState(false);
  const [pending, startTransition] = useTransition();

  function send() {
    const itemIds = items.map((i) => i.id);
    if (itemIds.length === 0) return;
    setSendError(false);
    startTransition(async () => {
      try {
        const r = await sendRfqsAction({
          projectId,
          itemIds,
          deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
          note: note || null,
          wantSample,
        });
        if (r.ok) {
          setToast(t("sentToast", { created: r.created, recipients: r.recipients }));
          setNote("");
          setDeadline("");
          setWantSample(false);
          onSent();
        } else {
          setSendError(true);
        }
      } catch {
        setSendError(true);
      }
    });
  }

  function close() {
    setToast(null);
    setSendError(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title={t("confirmTitle")}>
      {toast ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-ok">✓ {toast}</p>
          <div className="flex justify-end">
            <Button onClick={close}>{t("done")}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 3D: ticked-item rows — check, code chip, name, options count */}
          <div className="overflow-hidden rounded-card border border-line">
            {items.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 text-sm last:border-0"
              >
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-brand text-[11px] text-white">
                  ✓
                </span>
                <span className="rounded-[6px] border border-line px-1.5 py-0.5 font-mono text-[11px] text-sub">
                  {i.code}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink">{i.zone || "—"}</span>
                <span className="shrink-0 font-mono text-xs text-mut">
                  {i.options.length} {t("options")}
                </span>
              </div>
            ))}
          </div>

          {/* Sample toggle + deadline, the mock's twin boxes */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-card border border-line px-4 py-3">
              <span className="text-sm font-semibold text-ink">{t("wantSample")}</span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors ${
                  wantSample ? "bg-brand" : "bg-line-3"
                }`}
              >
                <input
                  type="checkbox"
                  checked={wantSample}
                  onChange={(e) => setWantSample(e.target.checked)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <span
                  className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-all ${
                    wantSample ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </span>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-card border border-line px-4 py-3">
              <span className="text-sm font-semibold text-ink">{t("deadline")}</span>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-40 font-mono"
              />
            </label>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t("notePlaceholder")}
            aria-label={t("note")}
            className="rounded-card border border-line-2 bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />

          <p className="text-xs text-mut">🔒 {t("privacy")}</p>
          {sendError && (
            <p className="text-sm text-warn" role="alert">
              {t("sendFailed")}
            </p>
          )}

          {/* Footer: summary counts + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span>
              <span className="block text-sm font-bold text-ink">
                {t("summaryCounts", {
                  items: items.length,
                  options: items.reduce((n, i) => n + i.options.length, 0),
                })}
              </span>
              <span className="font-mono text-[11.5px] text-mut">{t("reach48h")}</span>
            </span>
            <span className="flex gap-2">
              <Button variant="ghost" onClick={close}>
                {t("cancel")}
              </Button>
              <Button onClick={send} disabled={pending || items.length === 0}>
                {pending ? t("sending") : t("confirm")}
              </Button>
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}
