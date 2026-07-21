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
          <div className="flex flex-wrap gap-1.5">
            {items.map((i) => (
              <span
                key={i.id}
                className="rounded-pill border border-line bg-canvas px-2 py-0.5 text-xs text-sub"
              >
                {i.code}
                {i.zone ? ` · ${i.zone}` : ""} · {i.options.length} {t("options")}
              </span>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("deadline")}
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("note")}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t("notePlaceholder")}
              className="rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm font-normal outline-none focus:border-brand"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={wantSample}
              onChange={(e) => setWantSample(e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            {t("wantSample")}
          </label>
          <p className="font-mono text-[11.5px] text-mut">{t("reach48h")}</p>
          <p className="text-xs text-mut">🔒 {t("privacy")}</p>
          {sendError && (
            <p className="text-sm text-warn" role="alert">
              {t("sendFailed")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              {t("cancel")}
            </Button>
            <Button onClick={send} disabled={pending || items.length === 0}>
              {pending ? t("sending") : t("confirm")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
