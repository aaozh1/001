// CSS-only material textures — ported from reference/matlist-prototype.jsx.
// Stands in for real product photos until sellers upload them; the Swatch
// component and (later) the Material Board (Phase 1.5) render these.

export type TextureKind =
  | "wood"
  | "tile"
  | "terrazzo"
  | "brick"
  | "concrete"
  | "metal"
  | "glass"
  | "fabric"
  | "gypsum"
  | "paint"
  | "solid";

/** Lighten/darken a #rrggbb hex by an additive amount per channel. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v + amt));
  return (
    "#" +
    [clamp(n >> 16), clamp((n >> 8) & 255), clamp(n & 255)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Inline CSS style producing a layered texture for the given base color. */
export function texture(hex: string, kind: TextureKind = "solid"): React.CSSProperties {
  const c = hex;
  const d = shade(c, -18);
  const dd = shade(c, -38);
  const l = shade(c, 16);
  const ll = shade(c, 30);

  switch (kind) {
    case "wood":
      return {
        background: `repeating-linear-gradient(93deg, ${c} 0 14px, ${d} 14px 16px, ${l} 16px 30px, ${d} 30px 31px, ${c} 31px 46px), linear-gradient(180deg, ${ll}22, transparent 40%)`,
        backgroundBlendMode: "multiply, normal",
      };
    case "tile":
      return {
        background: `linear-gradient(45deg, ${ll}55 0%, transparent 45%), repeating-linear-gradient(0deg, ${c} 0 44px, ${dd} 44px 46px), repeating-linear-gradient(90deg, ${c}00 0 44px, ${dd} 44px 46px)`,
        backgroundColor: c,
      };
    case "terrazzo":
      return {
        background: `radial-gradient(circle 5px at 12% 20%, ${dd} 98%, transparent), radial-gradient(circle 4px at 35% 60%, ${l} 98%, transparent), radial-gradient(circle 6px at 60% 30%, ${dd} 98%, transparent), radial-gradient(circle 3px at 80% 70%, ${d} 98%, transparent), radial-gradient(circle 5px at 25% 85%, ${l} 98%, transparent), radial-gradient(circle 4px at 90% 15%, ${d} 98%, transparent), radial-gradient(circle 3px at 50% 90%, ${dd} 98%, transparent), radial-gradient(circle 5px at 70% 55%, ${ll} 98%, transparent), ${c}`,
      };
    case "brick":
      return {
        background: `repeating-linear-gradient(0deg, ${c} 0 22px, ${shade(c, -45)} 22px 25px), repeating-linear-gradient(90deg, transparent 0 46px, ${shade(c, -45)} 46px 49px)`,
        backgroundColor: c,
      };
    case "concrete":
      return {
        background: `linear-gradient(120deg, ${l}44, transparent 55%), radial-gradient(circle 2px at 20% 30%, ${d} 98%, transparent), radial-gradient(circle 2px at 70% 60%, ${d} 98%, transparent), radial-gradient(circle 1.5px at 45% 80%, ${dd} 98%, transparent), ${c}`,
      };
    case "metal":
      return {
        background: `repeating-linear-gradient(90deg, ${c} 0 2px, ${l} 2px 3px, ${c} 3px 5px, ${d} 5px 6px), linear-gradient(100deg, transparent 30%, ${ll}66 48%, transparent 60%)`,
        backgroundColor: c,
      };
    case "glass":
      return {
        background: `linear-gradient(115deg, ${ll} 0%, ${c} 35%, ${l} 50%, ${c} 65%, ${d} 100%)`,
      };
    case "fabric":
      return {
        background: `repeating-linear-gradient(45deg, ${c} 0 3px, ${d} 3px 4px), repeating-linear-gradient(-45deg, transparent 0 3px, ${l}55 3px 4px)`,
        backgroundColor: c,
      };
    case "gypsum":
      return {
        background: `radial-gradient(circle 1.5px at 25% 25%, ${d} 98%, transparent), radial-gradient(circle 1.5px at 75% 25%, ${d} 98%, transparent), radial-gradient(circle 1.5px at 25% 75%, ${d} 98%, transparent), radial-gradient(circle 1.5px at 75% 75%, ${d} 98%, transparent), ${c}`,
        backgroundSize: "26px 26px",
      };
    case "paint":
      return {
        background: `linear-gradient(160deg, ${l} 0%, ${c} 45%, ${d} 100%)`,
      };
    default:
      return { background: c };
  }
}
