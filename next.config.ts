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
    // Optimize package imports for better tree-shaking
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@anthropic-ai/sdk',
      'react-markdown',
      'exceljs'
    ],
  },

  // Environment variables exposed to client
  env: {
    NEXT_PUBLIC_APP_VERSION: '3.0.0',
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Exclude Node.js native modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        zlib: false,
        http: false,
        https: false,
      };
    }

    // Externalize better-sqlite3 for server-side only
    config.externals = config.externals || [];
    config.externals.push({
      'better-sqlite3': 'commonjs better-sqlite3',
    });

    return config;
  },
};

export default nextConfig;
