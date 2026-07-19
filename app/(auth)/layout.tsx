import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4">
        <Link href="/" className="text-lg font-bold text-earth">
          {t("appName")}
        </Link>
        <LocaleSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_8px_24px_-12px_rgba(28,26,23,0.18)]">
          {children}
        </div>
      </main>
    </div>
  );
}
