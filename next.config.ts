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
  // Allow dev server to be accessed from local network
  allowedDevOrigins: ["172.20.10.14", "localhost:3001"],
};

export default nextConfig;
