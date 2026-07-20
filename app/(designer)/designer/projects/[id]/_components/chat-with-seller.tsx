"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Opens (or reuses) a project-bound chat thread with a seller, then navigates
// to it. Designer-initiated — chat is an engagement channel the designer starts.
export function ChatWithSellerButton({
  projectId,
  sellerOrgId,
}: {
  projectId: string;
  sellerOrgId: string;
}) {
  const t = useTranslations("chat");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function open() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, sellerOrgId }),
      });
      if (res.ok) {
        const { threadId } = (await res.json()) as { threadId: string };
        router.push(`/designer/chat/${threadId}`);
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={pending}
      className={`text-xs hover:underline disabled:opacity-50 ${failed ? "text-warn" : "text-brand"}`}
      title={failed ? t("sendFailed") : undefined}
    >
      💬 {failed ? t("sendFailed") : t("withSellerShort")}
    </button>
  );
}
