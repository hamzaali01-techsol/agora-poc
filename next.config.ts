import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack — agora-rtc-sdk-ng needs webpack for proper resolution
  turbopack: undefined,
};

export default nextConfig;
