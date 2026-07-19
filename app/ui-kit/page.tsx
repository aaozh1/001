"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Card,
  Chip,
  Input,
  Modal,
  StatusChip,
  Swatch,
} from "@/components/ui";
import { SPEC_STATUSES } from "@/lib/spec/status";
import { LangToggle } from "../_components/lang-toggle";

// Living showcase of the design system (task 0.4) — a quick visual check that
// every primitive renders and stays in sync with the tokens.
export default function UiKitPage() {
  const t = useTranslations("uikit");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeChip, setActiveChip] = useState("all");

  const swatches: { color: string; texture: Parameters<typeof Swatch>[0]["texture"]; label: string }[] = [
    { color: "#E4E1DC", texture: "tile", label: "Tile" },
    { color: "#A9743F", texture: "wood", label: "Wood" },
    { color: "#C9C2B4", texture: "terrazzo", label: "Terrazzo" },
    { color: "#B0512F", texture: "brick", label: "Brick" },
    { color: "#5B6670", texture: "metal", label: "Metal" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {t("title")}
          </h1>
          <p className="mt-1 text-sub">{t("subtitle")}</p>
        </div>
        <LangToggle />
      </header>

      <Section title={t("buttons")}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title={t("statusChips")}>
        <div className="flex flex-wrap gap-2">
          {SPEC_STATUSES.map((s) => (
            <StatusChip key={s} status={s} count={s === "sent" ? 3 : undefined} />
          ))}
          <Badge variant="brand">Badge</Badge>
        </div>
      </Section>

      <Section title={t("chips")}>
        <div className="flex flex-wrap gap-2">
          {["all", "tiles", "wood", "metal"].map((c) => (
            <Chip
              key={c}
              active={activeChip === c}
              onClick={() => setActiveChip(c)}
            >
              {c}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title={t("cards")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card interactive className="gap-2">
            <span className="font-semibold text-ink">Card</span>
            <span className="text-sm text-sub">{t("sampleCard")}</span>
          </Card>
          <Card padded={false} interactive>
            <Swatch color="#7FB8AE" texture="glass" className="rounded-none" />
            <div className="flex flex-col gap-1 p-[14px]">
              <span className="text-sm font-semibold text-ink">
                Card + Swatch
              </span>
              <Input placeholder="Input inside a card" />
            </div>
          </Card>
        </div>
      </Section>

      <Section title={t("swatches")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {swatches.map((s) => (
            <Swatch key={s.label} color={s.color} texture={s.texture} label={s.label} />
          ))}
        </div>
      </Section>

      <Section title={t("modal")}>
        <Button variant="ghost" onClick={() => setModalOpen(true)}>
          {t("openModal")}
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={t("modal")}
        >
          <p className="text-sm text-sub">{t("modalBody")}</p>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setModalOpen(false)}>OK</Button>
          </div>
        </Modal>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mut">
        {title}
      </h2>
      {children}
    </section>
  );
}
