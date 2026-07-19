// Minimal className joiner (no dependency). Filters falsy values so callers can
// write cn("base", cond && "extra").
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
