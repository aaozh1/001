import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdfkit reads its bundled font-metric data via fs at runtime; keep it (and
  // fontkit) as external Node modules so Next doesn't bundle those assets away.
  serverExternalPackages: ["pdfkit", "fontkit", "exceljs"],
};

// Cookie-based i18n (no locale in the URL) — see lib/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(nextConfig);
