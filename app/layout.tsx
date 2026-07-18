import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatList",
  description: "วัสดุครบ จบที่ลิสต์เดียว — Every material. One list.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default locale is Thai (see CLAUDE.md). i18n toggle lands in task 0.3.
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
