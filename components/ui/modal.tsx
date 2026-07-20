"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Wider variant for comparison tables etc. (prototype `.modal.wide`). */
  wide?: boolean;
  closeLabel?: string;
  children: React.ReactNode;
}

// Centered dialog over a dimmed, blurred backdrop — ported from prototype
// `.overlay` / `.modal` / `.close`. Closes on Esc and backdrop click.
export function Modal({
  open,
  onClose,
  title,
  wide,
  closeLabel,
  children,
}: ModalProps) {
  // Default the ✕ label from i18n — a hardcoded "Close" reads wrong to Thai
  // screen-reader users (i18n rule: no hardcoded UI strings).
  const t = useTranslations("common");
  const resolvedCloseLabel = closeLabel ?? t("close");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(20_24_32_/_0.42)] p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative max-h-[88vh] w-full overflow-y-auto rounded-[18px] bg-surface p-[22px] shadow-lifted",
          wide ? "max-w-[760px]" : "max-w-[560px]",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label={resolvedCloseLabel}
          className="absolute right-[14px] top-3 flex h-[30px] w-[30px] items-center justify-center rounded-pill bg-canvas text-[13px] text-sub hover:bg-line"
        >
          ✕
        </button>
        {title && (
          <h2 className="mb-3 pr-8 text-[16.5px] font-bold text-ink">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
