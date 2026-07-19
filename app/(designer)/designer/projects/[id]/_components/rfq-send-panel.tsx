"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, StatusChip } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { sendRfqsAction } from "@/lib/rfq/actions";
import { QuoteCompareButton } from "./quote-compare";

export interface RfqItemQuote {
  quoteId: string;
  sellerName: string;
  pricePerUnit: string;
  projectDiscount: string | null;
  leadTime: string | null;
  paymentTerms: string | null;
  validUntil: string | null;
  includeSample: boolean;
  status: string;
}

export interface RfqItem {
  id: string;
  code: string;
  zone: string;
  optionCount: number;
  state: "none" | "sent" | "quoted";
  rfqId: string | null;
  rfqStatus: string | null;
  quotes: RfqItemQuote[];
}

export function RfqSendPanel({
  projectId,
  canManage,
  items,
}: {
  projectId: string;
  canManage: boolean;
  items: RfqItem[];
}) {
  const t = useTranslations("rfq");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [wantSample, setWantSample] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const withOptions = items.filter((i) => i.optionCount > 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function send() {
    const itemIds = [...selected];
    if (itemIds.length === 0) return;
    startTransition(async () => {
      const r = await sendRfqsAction({
        projectId,
        itemIds,
        deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
        note: note || null,
        wantSample,
      });
      if (r.ok) {
        setToast(t("sentToast", { created: r.created, recipients: r.recipients }));
        setSelected(new Set());
        setOpen(false);
        setNote("");
        setDeadline("");
        setWantSample(false);
      }
    });
  }

  return (
    <div className="mt-4 rounded-card border border-line bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">{t("title")}</h2>
          <p className="text-xs text-mut">{t("hint")}</p>
          <p className="mt-1 text-xs text-mut">🔒 {t("privacy")}</p>
        </div>
      </div>

      {withOptions.length === 0 ? (
        <p className="mt-3 text-sm text-sub">{t("noItems")}</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-line">
            {withOptions.map((it) => {
              const sent = it.state !== "none";
              return (
                <li key={it.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      className={cn(
                        "flex items-center gap-2",
                        sent ? "text-mut" : "cursor-pointer text-ink",
                      )}
                    >
                      <input
                        type="checkbox"
                        disabled={sent || !canManage}
                        checked={selected.has(it.id)}
                        onChange={() => toggle(it.id)}
                        className="h-4 w-4 accent-brand"
                      />
                      <span className="font-medium">{it.code}</span>
                      {it.zone && <span className="text-sub">· {it.zone}</span>}
                      <span className="text-xs text-mut">
                        · {it.optionCount} {t("options")}
                      </span>
                    </label>
                    {sent && (
                      <StatusChip status={it.state === "quoted" ? "quoted" : "sent"} />
                    )}
                  </div>
                  {it.quotes.length > 0 && it.rfqId && (
                    <div className="mt-1.5 ml-6 flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-mut">
                        {t("quotesReceived")} ({it.quotes.length})
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {it.quotes.map((q) => (
                          <span
                            key={q.quoteId}
                            className={cn(
                              "rounded-pill px-2 py-0.5 text-xs",
                              q.status === "selected"
                                ? "bg-ok-soft font-semibold text-ok"
                                : q.status === "rejected"
                                  ? "text-mut line-through"
                                  : "text-sub",
                            )}
                          >
                            {q.sellerName} ฿{q.pricePerUnit}
                          </span>
                        ))}
                      </div>
                      {canManage && (
                        <div>
                          <QuoteCompareButton
                            projectId={projectId}
                            rfqId={it.rfqId}
                            rfqStatus={it.rfqStatus ?? "quoted"}
                            quotes={it.quotes}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {canManage && (
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                disabled={selected.size === 0 || pending}
                onClick={() => setOpen(true)}
              >
                {t("send")}
              </Button>
              {selected.size > 0 && (
                <span className="text-xs text-sub">{t("selected", { n: selected.size })}</span>
              )}
            </div>
          )}
        </>
      )}

      {toast && <p className="mt-3 text-sm font-medium text-ok">✓ {toast}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={t("confirmTitle")}>
        <div className="flex flex-col gap-4">
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
          <p className="text-xs text-mut">🔒 {t("privacy")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={send} disabled={pending}>
              {pending ? t("sending") : t("confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
