"use client";

import dynamic from "next/dynamic";

const WriteClient = dynamic(() => import("./WriteClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <p className="text-white text-sm opacity-50">불러오는 중...</p>
    </div>
  ),
});

export default function WritePage() {
  return <WriteClient />;
}
