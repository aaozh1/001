import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Redesign typography (handoff design system): IBM Plex Sans Thai for UI text,
// IBM Plex Mono for codes / SKUs / prices / eyebrows.
const plexSans = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
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
    <html lang={locale} className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
