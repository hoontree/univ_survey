import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run 컨테이너용 최소 런타임 번들 (.next/standalone)
  output: "standalone",

  /**
   * HTML 문서 캐시 제어.
   * Next는 정적 페이지에 s-maxage=1년을 붙이는데, 앞단 Firebase Hosting CDN이
   * 그걸 1년간 캐시해 배포가 즉시 반영되지 않는다(og:image 등 stale).
   * content-hash된 정적 자산(/_next/static)은 그대로 두고, 문서만 짧게 캐시한다.
   */
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
