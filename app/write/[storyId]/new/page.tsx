import { Suspense } from "react";
import NewEpisodeClient from "./NewEpisodeClient";

export default function NewEpisodePage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white/40 text-sm">불러오는 중...</p>
      </div>
    }>
      <NewEpisodeClient />
    </Suspense>
  );
}
