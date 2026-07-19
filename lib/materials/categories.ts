// Material category families (from the seed catalog). Stored on Material.category
// as the Thai key; this maps to an English label for the EN locale. Icons are
// decorative glyphs matching the prototype's category tiles.

export const CATEGORY_META: { key: string; en: string; icon: string }[] = [
  { key: "กระเบื้อง & พอร์ซเลน", en: "Tiles & Porcelain", icon: "▦" },
  { key: "หินธรรมชาติ & หินขัด", en: "Stone & Terrazzo", icon: "◆" },
  { key: "ไม้จริง & ไม้เอนจิเนียร์", en: "Wood & Engineered", icon: "≣" },
  { key: "ไวนิล SPC & ลามิเนต", en: "Vinyl SPC & Laminate", icon: "▤" },
  { key: "อิฐ & บล็อก", en: "Brick & Block", icon: "▣" },
  { key: "ปูน คอนกรีต & ไฟเบอร์ซีเมนต์", en: "Concrete & Fiber Cement", icon: "◧" },
  { key: "ยิปซัม & อะคูสติก", en: "Gypsum & Acoustic", icon: "◫" },
  { key: "โลหะ & เหล็ก", en: "Metal & Steel", icon: "⬡" },
  { key: "กระจก & อะคริลิก", en: "Glass & Acrylic", icon: "◇" },
  { key: "สี & สารเคลือบผิว", en: "Paint & Coatings", icon: "◐" },
  { key: "ฉนวน & กันความร้อน", en: "Insulation", icon: "≋" },
  { key: "ผ้า หนัง & วัสดุบุผิว", en: "Fabric & Upholstery", icon: "▨" },
  { key: "สุขภัณฑ์ & ฟิตติ้ง", en: "Sanitary & Fittings", icon: "◍" },
  { key: "แสงสว่าง & โคมไฟ", en: "Lighting", icon: "◉" },
];

const byKey = new Map(CATEGORY_META.map((c) => [c.key, c]));

export function categoryLabel(category: string, locale: string): string {
  const meta = byKey.get(category);
  if (!meta) return category;
  return locale === "en" ? meta.en : meta.key;
}

export function categoryIcon(category: string): string {
  return byKey.get(category)?.icon ?? "▦";
}

import type { TextureKind } from "@/lib/ui/texture";

// Category → swatch texture (matches the prototype's per-family look).
const TEXTURE: Record<string, TextureKind> = {
  "กระเบื้อง & พอร์ซเลน": "tile",
  "หินธรรมชาติ & หินขัด": "terrazzo",
  "ไม้จริง & ไม้เอนจิเนียร์": "wood",
  "ไวนิล SPC & ลามิเนต": "wood",
  "อิฐ & บล็อก": "brick",
  "ปูน คอนกรีต & ไฟเบอร์ซีเมนต์": "concrete",
  "ยิปซัม & อะคูสติก": "gypsum",
  "โลหะ & เหล็ก": "metal",
  "กระจก & อะคริลิก": "glass",
  "สี & สารเคลือบผิว": "paint",
  "ฉนวน & กันความร้อน": "fabric",
  "ผ้า หนัง & วัสดุบุผิว": "fabric",
  "สุขภัณฑ์ & ฟิตติ้ง": "metal",
  "แสงสว่าง & โคมไฟ": "glass",
};

export function categoryTexture(category: string): TextureKind {
  return TEXTURE[category] ?? "solid";
}
