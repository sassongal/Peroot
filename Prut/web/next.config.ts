import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  compress: true,
  // Enable basePath for subdirectory deployment (e.g., joya-tech.net/peroot)
  // Set NEXT_PUBLIC_BASE_PATH=/peroot in production environment
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Ensure assets are loaded from the correct path
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', '@radix-ui/react-slot'],
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
