import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Enforce TypeScript errors during builds
    ignoreBuildErrors: false,
  },
  // Note: eslint config removed - Next.js 16+ handles ESLint via CLI (next lint)
};

export default nextConfig;
