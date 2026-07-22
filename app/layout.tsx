import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Redesign typography (handoff design system): IBM Plex Sans Thai for UI text.
// Label type = "Clean sans" — codes/SKUs/prices/eyebrows use the same family
// (see --font-mono alias in globals.css), so no mono font is loaded.
const plexSans = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-plex-sans",
  display: "swap",
});

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
    <html lang={locale} className={plexSans.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
