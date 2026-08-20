import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['unlit-scalded-throat.ngrok-free.dev', '*.ngrok-free.dev'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
