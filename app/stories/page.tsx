"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppState, Story } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import AuthorModeToggle from "@/app/components/AuthorModeToggle";

export default function StoriesPage() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setMounted(true);
  }, []);

  if (!mounted || !appState) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white text-sm opacity-50">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <button
          onClick={() => router.push("/")}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          ← 홈
        </button>
        <p className="text-white/80 text-sm font-medium">전체 작품</p>
        <AuthorModeToggle />
      </div>

      {/* 작품 목록 */}
      <div className="px-6 py-4">
        {appState.stories.map((story: Story) => {
          const mainUniverse = story.universes.find((u) => u.isMain) ?? story.universes[0];
          const totalEpisodes = mainUniverse.episodes.length;
          const totalUniverses = story.universes.length;

          return (
            <div
              key={story.id}
              onClick={() => router.push(`/reader/${story.id}/0`)}
              className="flex items-start gap-4 py-5 border-b border-white/10 cursor-pointer hover:bg-white/5 -mx-6 px-6 transition-colors active:bg-white/10"
            >
              {/* 컬러 블록 (커버 대체) */}
              <div
                className="w-14 h-20 rounded-xl flex-shrink-0"
                style={{ backgroundColor: story.coverColor }}
              />

              {/* 정보 */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/40 text-xs uppercase tracking-widest">
                    {story.genre}
                  </span>
                  {totalUniverses > 1 && (
                    <span className="text-white/20 text-xs">
                      · 유니버스 {totalUniverses}개
                    </span>
                  )}
                </div>
                <h2 className="text-white font-semibold text-base mb-1">
                  {story.title}
                </h2>
                <p className="text-white/40 text-xs mb-3">
                  by {story.author}
                </p>
                <p className="text-white/60 text-sm leading-relaxed line-clamp-2">
                  {story.hook}
                </p>
                <p className="text-white/30 text-xs mt-2">
                  총 {totalEpisodes}화
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}