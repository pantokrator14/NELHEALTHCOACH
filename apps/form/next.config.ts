import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
};

export default nextConfig;
