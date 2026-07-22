"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { addReviewAction } from "@/lib/reviews/actions";

export interface ReviewRow {
  id: string;
  role: string;
  stars: number;
  body: string | null;
  dateLabel: string;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[13px] tracking-tight text-rating" aria-label={`${n}/5`}>
      {"★".repeat(n)}
      <span className="opacity-30">{"★".repeat(5 - n)}</span>
    </span>
  );
}

// 3B reviews — read for everyone, write ONLY for verified purchasers (the
// server re-checks; the form never even renders otherwise).
export function MaterialReviews({
  materialId,
  reviews,
  canReview,
}: {
  materialId: string;
  reviews: ReviewRow[];
  canReview: boolean;
}) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(false);
    startTransition(async () => {
      const r = await addReviewAction(materialId, { stars, body });
      if (r.ok) {
        setFormOpen(false);
        setBody("");
        router.refresh();
      } else {
        setError(true);
      }
    });
  }

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-ink">{t("title")}</h2>
        {canReview ? (
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="text-sm font-semibold text-brand hover:underline"
          >
            {t("write")}
          </button>
        ) : (
          <span className="text-xs text-mut">{t("verifiedOnly")}</span>
        )}
      </div>

      {formOpen && canReview && (
        <div className="mb-4 flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                aria-label={`${n}/5`}
                className={`text-xl transition ${n <= stars ? "text-rating" : "text-line-3"}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t("placeholder")}
            className="rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
          {error && (
            <p className="text-sm text-warn" role="alert">
              {t("failed")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {pending ? t("sending") : t("send")}
            </Button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-6 text-center text-sm text-mut">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-card border border-line bg-surface px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold text-ink">
                  {t(`role.${r.role}`)}
                  <Stars n={r.stars} />
                  <span className="rounded-pill bg-ok-soft px-2 py-0.5 font-mono text-[10px] text-ok">
                    ✓ {t("verified")}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-mut">{r.dateLabel}</span>
              </div>
              {r.body && <p className="mt-1 text-sm text-sub">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
