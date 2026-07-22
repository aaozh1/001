import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LangToggle } from "./lang-toggle";
import { Logo } from "./logo";
import { Card } from "@/components/ui";

// Auth layouts (design 2A/3A): login uses the split brand-panel layout, the
// register page keeps the centered card. Both carry the language toggle.
export async function AuthShell({
  children,
  variant = "card",
}: {
  children: React.ReactNode;
  variant?: "card" | "split";
}) {
  if (variant === "split") {
    const ta = await getTranslations("auth");
    return (
      <main className="flex min-h-screen bg-surface">
        {/* Brand panel — 2A left side */}
        <aside className="hidden w-[44%] flex-col justify-between border-r border-line bg-canvas p-8 lg:flex">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <div>
            <p className="eyebrow">{ta("panelEyebrow")}</p>
            <h2 className="mt-3 max-w-md text-[40px] font-bold leading-tight tracking-tight text-ink">
              {ta("panelTitle")}
            </h2>
            <ul className="mt-6 flex flex-col gap-2.5 text-[18.75px] text-ink-2">
              {(["panelB1", "panelB2", "panelB3"] as const).map((k) => (
                <li key={k} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-brand">✓</span>
                  {ta(k)}
                </li>
              ))}
            </ul>
          </div>
          <p className="font-mono text-xs text-mut">{ta("panelTagline")}</p>
        </aside>

        {/* Form side */}
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center lg:invisible">
              <Logo />
            </Link>
            <LangToggle />
          </header>
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <LangToggle />
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <Card padded={false} className="w-full max-w-sm p-8">
          <div className="mb-4">
            <Logo />
          </div>
          {children}
        </Card>
      </div>
    </main>
  );
}
