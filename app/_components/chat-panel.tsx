"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { cn } from "@/lib/ui/cn";

interface Message {
  id: string;
  body: string;
  createdAt: string;
  senderSide: "designer" | "seller";
  mine: boolean;
}

const POLL_MS = 4000;

// 2-sided chat panel. Polls the thread every few seconds (Phase 2.5 accepts
// polling before realtime) and posts new messages. Identical for both sides —
// the server decides what each side may see.
export function ChatPanel({ threadId }: { threadId: string }) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${threadId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Message[] };
      setMessages((prev) =>
        prev.length === data.messages.length &&
        prev[prev.length - 1]?.id === data.messages[data.messages.length - 1]?.id
          ? prev
          : data.messages,
      );
    } finally {
      setLoaded(true);
    }
  }, [threadId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const data = (await res.json()) as { message: Message };
        setMessages((prev) => [...prev, data.message]);
        setInput("");
      }
    } finally {
      setSending(false);
    }
  }

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex h-[60vh] flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto rounded-card border border-line bg-canvas p-4"
      >
        {loaded && messages.length === 0 && (
          <p className="py-10 text-center text-sm text-mut">{t("empty")}</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                m.mine
                  ? "bg-brand text-white"
                  : "border border-line bg-surface text-ink",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <span
                className={cn(
                  "mt-1 block text-[10px]",
                  m.mine ? "text-white/70" : "text-mut",
                )}
              >
                {timeFmt.format(new Date(m.createdAt))}
              </span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder={t("placeholder")}
          className="flex-1 resize-none rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
        />
        <Button onClick={send} disabled={sending || !input.trim()}>
          {sending ? t("sending") : t("send")}
        </Button>
      </div>
    </div>
  );
}
