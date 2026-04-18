"use client";

// app/reader/[storyId]/[episode]/page.tsx
import dynamic from "next/dynamic";

const ReaderClient = dynamic(() => import("./ReaderClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <p className="text-white text-sm opacity-50">불러오는 중...</p>
    </div>
  ),
});

export default function ReaderPage() {
  return <ReaderClient />;
}