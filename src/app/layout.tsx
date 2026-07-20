import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

/* ONE Mobile — 브랜드 서체. 원본 OTF(1.9~4MB)를 KS X 1001 상용 한글로
   서브셋한 WOFF2(scripts/build_fonts.py 산출물). */
const oneMobile = localFont({
  src: [
    { path: "./fonts/ONEMobileRegular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ONEMobileBold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-one-mobile",
  display: "swap",
  fallback: ["Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
});

const oneMobileTitle = localFont({
  src: "./fonts/ONEMobileTitle.woff2",
  weight: "400 900",
  variable: "--font-one-mobile-title",
  display: "swap",
  fallback: ["Apple SD Gothic Neo", "sans-serif"],
});

/* 밀집 표·잔글씨용 + ONE Mobile 미커버 글리프 폴백 */
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "유니버설 UNIVERSEOL — 나의 대학이 열리는 곳",
    template: "%s | 유니버설",
  },
  description:
    "우주설 수리논술의 대학 추천 설문. 3분 설문으로 의대·약대·비메디컬 논술 지원 대학을 찾아드려요.",
  openGraph: {
    title: "유니버설 UNIVERSEOL",
    description: "설문 3분, 우주설이 찾아주는 나의 논술 1지망",
    type: "website",
    locale: "ko_KR",
    siteName: "유니버설",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${oneMobile.variable} ${oneMobileTitle.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
