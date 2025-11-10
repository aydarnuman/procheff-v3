import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output configuration for Docker/Cloud Run
  output: 'standalone',

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // For large file uploads
    },
  },

  // Environment variables exposed to client
  env: {
    NEXT_PUBLIC_APP_VERSION: '3.0.0',
  },
};

export default nextConfig;
