import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "유니버설 UNIVER설 — 나의 대학이 열리는 곳",
    template: "%s | 유니버설",
  },
  description:
    "우주설의 대학 추천 설문. 3분 설문으로 의대·약대·비메디컬 논술 지원 대학을 찾아드립니다.",
  openGraph: {
    title: "유니버설 UNIVER설",
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
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
