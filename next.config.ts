import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run 컨테이너용 최소 런타임 번들 (.next/standalone)
  output: "standalone",
};

export default nextConfig;
