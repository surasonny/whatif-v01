import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "What If",
  description: "AI 기반 멀티버스 웹소설 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>  );
}