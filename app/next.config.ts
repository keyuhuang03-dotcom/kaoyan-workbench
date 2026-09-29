import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Allow phones on private networks to load dev assets and hydrate even when
  // the computer's DHCP address changes. Keep these as hostnames (no ports).
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "192.168.*.*",
    "172.20.10.*",
    "10.*.*.*",
  ],
};

export default nextConfig;
