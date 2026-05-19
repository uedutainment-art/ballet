import type { Metadata } from "next";
import "./globals.css";

// Root layout owns global concerns only: <html>, <body>, metadata, font links.
// Page chrome (header / footer / nav) lives in route-group layouts such as
// app/(public)/layout.tsx so admin / operator routes can have their own.

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
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
