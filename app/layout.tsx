import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";

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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}