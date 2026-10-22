import type { NextConfig } from "next";
import { readProductVersion } from "./version";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_LEDGESEC_VERSION: readProductVersion(),
  },
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    const origin = process.env.LEDGESEC_DEV_API;
    if (!origin) return [];
    return [{ source: "/api/:path*", destination: `${origin}/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
