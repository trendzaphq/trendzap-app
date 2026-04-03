// next.config.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Docker/Railway. Vercel ignores this automatically.
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  turbopack: {},

  webpack: (config, { isServer }) => {
    // Only apply these aliases on client (browser) bundle
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'thread-stream': require.resolve('./lib/thread-stream-shim.js'),
        'thread-stream/test': false,
        'why-is-node-running': false,
        'pino': 'pino/browser',
        // Optional: more aggressive cleanup of test files
        '^.*\\/thread-stream\\/test\\/.*$': false,
        '^.*\\/node_modules\\/(tap|tape)\\/.*$': false,
      };

      // Alternative (sometimes more reliable): use fallback
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'thread-stream': require.resolve('./lib/thread-stream-shim.js'),
        'pino': require.resolve('pino/browser'),
      };
    }

    return config;
  },
};

export default nextConfig;