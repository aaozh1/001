import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LangToggle } from "./lang-toggle";
import { Card } from "@/components/ui";

// Centered card layout shared by /login and /register, with the site-wide
// language toggle in the header.
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-[21px] font-bold tracking-tight text-brand">
          {t("appName")}
        </Link>
        <LangToggle />
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <Card padded={false} className="w-full max-w-sm p-8">
          {children}
        </Card>
      </div>
    </main>
  );
}
