import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-slot', 'posthog-js', '@sentry/nextjs'],
  },
  turbopack: {
     root: __dirname,
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  // Upload sourcemaps only in production
  disableServerWebpackPlugin: process.env.NODE_ENV !== "production",
  disableClientWebpackPlugin: process.env.NODE_ENV !== "production",
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
