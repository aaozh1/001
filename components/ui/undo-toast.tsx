"use client";

import { useEffect } from "react";

// Bottom toast with an undo affordance — replaces blunt confirm dialogs for
// destructive-but-recoverable actions (ลบแล้ว "เลิกทำ" ได้ 6 วินาที).
export function UndoToast({
  message,
  undoLabel,
  onUndo,
  onExpire,
  durationMs = 6000,
}: {
  message: string;
  undoLabel: string;
  onUndo: () => void;
  onExpire: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const id = setTimeout(onExpire, durationMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-pill bg-ink px-4 py-2.5 text-sm text-white shadow-lifted">
      <span>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="rounded-pill bg-white/15 px-2.5 py-1 text-[16.25px] font-semibold text-white hover:bg-white/25"
      >
        ↩ {undoLabel}
      </button>
    </div>
  );
}
