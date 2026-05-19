import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";

// Root layout owns global concerns only: <html>, <body>, metadata, fonts.
// Page chrome (header / footer / nav) lives in route-group layouts such as
// app/(public)/layout.tsx so admin / operator routes can have their own.

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "K BALLET & CO. — Info Hub",
  description:
    "발레 콩쿠르 · 입시 · 공연 정보를 한 곳에서. AI 1차 정리 + 관리자 검수.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={notoSerifKR.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
