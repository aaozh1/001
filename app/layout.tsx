import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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
  // Locale resolved from the NEXT_LOCALE cookie (default TH); the whole tree
  // renders in that language and re-renders when the LocaleSwitcher flips it.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
