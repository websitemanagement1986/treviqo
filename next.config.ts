import type { NextConfig } from "next";

const isStaticExport = process.env.HOSTINGER_STATIC === "true";

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" as const } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;