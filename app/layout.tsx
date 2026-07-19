import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatList",
  description: "วัสดุครบ จบที่ลิสต์เดียว — Every material. One list.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locale comes from the NEXT_LOCALE cookie (default th). NextIntlClientProvider
  // inherits the locale + messages resolved in lib/i18n/request.ts.
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
