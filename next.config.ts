import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Baseline security headers (Phase 4.3). HSTS only bites over HTTPS, so it is
// safe to ship unconditionally; the reverse proxy should terminate TLS.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdfkit reads its bundled font-metric data via fs at runtime; keep it (and
  // fontkit) as external Node modules so Next doesn't bundle those assets away.
  serverExternalPackages: ["pdfkit", "fontkit", "exceljs"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Cookie-based i18n (no locale in the URL) — see lib/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(nextConfig);
