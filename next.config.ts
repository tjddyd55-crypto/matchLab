import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright E2E uses 127.0.0.1; allow Server Actions from that host in dev.
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@prisma/client", "pg"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
