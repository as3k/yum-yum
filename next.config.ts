import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  allowedDevOrigins: ["0.0.0.0", "localhost", "192.168.8.82", "100.113.96.53"],
};

export default nextConfig;
