"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";

interface CommentView {
  guestName: string;
  comment: string;
}

// 5F guest controls on a shared Spec Book line: approve chip + comment box.
// No login — the link is the credential; everything is rate-limited server-side.
export function GuestFeedback({
  token,
  itemCode,
  approvals: initialApprovals,
  comments: initialComments,
}: {
  token: string;
  itemCode: string;
  approvals: number;
  comments: CommentView[];
}) {
  const t = useTranslations("share");
  const [approvals, setApprovals] = useState(initialApprovals);
  const [comments, setComments] = useState(initialComments);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"approved" | null>(null);
  const [error, setError] = useState(false);

  async function send(kind: "approve" | "comment") {
    if (busy || !name.trim() || (kind === "comment" && !text.trim())) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/share/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemCode,
          guestName: name.trim(),
          kind,
          comment: kind === "comment" ? text.trim() : undefined,
        }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      if (kind === "approve") {
        setApprovals((n) => n + 1);
        setDone("approved");
      } else {
        setComments((prev) => [...prev, { guestName: name.trim(), comment: text.trim() }]);
        setText("");
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {approvals > 0 && (
          <span className="rounded-pill bg-ok-soft px-2.5 py-1 font-mono text-[13.75px] font-semibold text-ok">
            ✓ {t("approvedN", { n: approvals })}
          </span>
        )}
        {comments.length > 0 && (
          <span className="rounded-pill bg-info-soft px-2.5 py-1 font-mono text-[13.75px] font-semibold text-info">
            💬 {comments.length}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpenForm((v) => !v)}
          className="ml-auto text-[15px] font-semibold text-brand hover:underline"
        >
          {openForm ? t("closeForm") : t("openForm")}
        </button>
      </div>

      {comments.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {comments.map((c, i) => (
            <p key={i} className="text-[16.25px] text-sub">
              <span className="font-semibold text-ink">{c.guestName}:</span> {c.comment}
            </p>
          ))}
        </div>
      )}

      {openForm && (
        <div className="mt-2.5 flex flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("guestName")}
            aria-label={t("guestName")}
            className="w-full max-w-xs rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={t("commentPh")}
            aria-label={t("commentPh")}
            className="w-full rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || !name.trim() || !text.trim()}
              onClick={() => void send("comment")}
              className="rounded-sm border border-line-3 px-3.5 py-2 text-[16.25px] font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-50"
            >
              {t("sendComment")}
            </button>
            <button
              type="button"
              disabled={busy || !name.trim() || done === "approved"}
              onClick={() => void send("approve")}
              className={cn(
                "rounded-sm px-3.5 py-2 text-[16.25px] font-semibold text-white transition disabled:opacity-60",
                done === "approved" ? "bg-ok" : "bg-brand hover:bg-brand-deep",
              )}
            >
              {done === "approved" ? `✓ ${t("approved")}` : `✓ ${t("approve")}`}
            </button>
            {error && (
              <span className="text-[15px] text-warn" role="alert">
                {t("fbFailed")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
