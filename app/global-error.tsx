"use client";

import { useEffect } from "react";

// Root-layout crash fallback (Phase 4.3). Renders OUTSIDE the i18n provider,
// so the copy is hardcoded bilingual by necessity — the one sanctioned
// exception to the no-hardcoded-strings rule.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="th">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 40, textAlign: "center" }}>
        <p style={{ fontSize: 40, margin: 0 }}>😵</p>
        <h1 style={{ fontSize: 20 }}>เกิดข้อผิดพลาด / Something went wrong</h1>
        <p style={{ color: "#666", fontSize: 14 }}>
          ลองใหม่อีกครั้ง — ถ้ายังพังอยู่ ทีมงานเห็น log แล้ว
          <br />
          Try again — if it persists, it&apos;s already in our logs.
        </p>
        {error.digest && (
          <p style={{ color: "#999", fontSize: 12 }}>ref: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 12,
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ลองใหม่ / Retry
        </button>
      </body>
    </html>
  );
}
