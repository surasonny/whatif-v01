"use client";

import dynamic from "next/dynamic";

const EditClient = dynamic(() => import("./EditClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <p className="text-white text-sm opacity-50">불러오는 중...</p>
    </div>
  ),
});

export default function EditPage() {
  return <EditClient />;
}
