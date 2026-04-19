"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppState, Story, Universe } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";

export default function UniversePage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;

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

  const story: Story | undefined = appState.stories.find((s) => s.id === storyId);

  if (!story) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white text-sm opacity-50">작품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          ← 뒤로
        </button>
        <p className="text-white/80 text-sm font-medium">{story.title}</p>
        <div className="w-8" />
      </div>

      <div className="relative h-48 overflow-hidden">
        <img
          src={`https://picsum.photos/seed/${story.id}-home/800/400`}
          alt={story.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute bottom-6 left-6">
          <p className="text-white/50 text-xs mb-1">{story.genre}</p>
          <h1 className="text-white text-2xl font-bold">{story.title}</h1>
          <p className="text-white/40 text-xs mt-1">by {story.author}</p>
        </div>
      </div>

      <div className="px-6 py-4">
        <p className="text-white/40 text-xs tracking-widest mb-4">
          유니버스 {story.universes.length}개
        </p>

        {story.universes.map((universe: Universe, i: number) => {
          const totalLikes = universe.episodes.reduce((sum, ep) => sum + ep.likes, 0);
          const totalEpisodes = universe.episodes.length;

          return (
            <div
              key={universe.id}
              onClick={() => router.push(`/reader/${storyId}/0`)}
              className="mb-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white/80 text-sm font-medium">
                    {universe.label}
                  </span>
                  {universe.isMain && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                      정사
                    </span>
                  )}
                </div>
                <span className="text-white/30 text-xs">👍 {totalLikes}</span>
              </div>

              <div className="flex items-center gap-3 text-white/30 text-xs">
                <span>{totalEpisodes}화</span>
                {universe.branchFromEpisode !== null && (
                  <span>· {universe.branchFromEpisode + 1}화에서 분기</span>
                )}
              </div>

              {universe.episodes.length > 0 && (
                <p className="text-white/40 text-xs mt-2 line-clamp-2 leading-relaxed">
                  {universe.episodes[universe.episodes.length - 1].content.slice(0, 80)}...
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}