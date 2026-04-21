import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.posthog.com https://*.sentry.io https://*.lemonsqueezy.com https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://www.peroot.space https://*.clarity.ms https://ui-avatars.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.sentry.io https://*.lemonsqueezy.com https://generativelanguage.googleapis.com https://api.groq.com https://api.deepseek.com https://www.google-analytics.com https://analytics.google.com https://www.clarity.ms https://*.clarity.ms https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "frame-src 'self' https://*.lemonsqueezy.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  compress: true,
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: [
    "pdfjs-dist",
    "mammoth",
    "xlsx",
    "jsdom",
    "@mozilla/readability",
    "@napi-rs/canvas",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "posthog-js", "@sentry/nextjs"],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "peroot.space" }],
        destination: "https://www.peroot.space/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "www.peroot.space" },
      { protocol: "https", hostname: "ui-avatars.com", pathname: "/api/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...securityHeaders, { key: "Content-Language", value: "he" }],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space",
          },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
  disableServerWebpackPlugin: process.env.NODE_ENV !== "production",
  disableClientWebpackPlugin: process.env.NODE_ENV !== "production",
};

export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
