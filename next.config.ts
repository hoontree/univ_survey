import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run 컨테이너용 최소 런타임 번들 (.next/standalone)
  output: "standalone",

  /**
   * HTML 문서 캐시 제어.
   * Next는 정적 페이지에 s-maxage=1년을 붙이는데, 앞단 Firebase Hosting CDN이
   * 그걸 1년간 캐시해 배포가 즉시 반영되지 않는다(og:image 등 stale).
   * content-hash된 정적 자산(/_next/static)은 그대로 두고, 문서만 짧게 캐시한다.
   *
   * 단 `/admin`·`/api`는 이 공개 캐시에서 반드시 제외한다. 로그인 여부에 따라
   * 내용이 달라지는 응답을 CDN이 `public`으로 캐시하면 (1) 로그인 직후 새로고침이
   * 캐시된 로그아웃 화면을 받아 로그인 화면에 머물고 (2) 캐시된 대시보드가
   * 남에게 그대로 나갈 수 있다.
   */
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];
    return [
      {
        source: "/((?!_next/static|_next/image|admin|api/).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      { source: "/admin", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/api/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
