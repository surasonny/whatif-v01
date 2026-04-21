"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppState, Story } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { deleteStory, loadState } from "@/lib/store";
import { useMyNickname } from "@/app/components/AuthorModeToggle";

export default function StoriesPage() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { nickname: myNickname } = useMyNickname();

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setMounted(true);
  }, []);

  function reloadState() {
    const fresh = loadState();
    if (fresh) setAppState(fresh);
  }

  function handleDeleteClick(e: React.MouseEvent, storyId: string) {
    e.stopPropagation();
    setErrorMsg(null);
    setConfirmDeleteId(storyId);
  }

  function handleDeleteConfirm(e: React.MouseEvent, storyId: string) {
    e.stopPropagation();
    const result = deleteStory(storyId);
    if (!result.ok) {
      setErrorMsg(result.reason ?? "삭제할 수 없습니다.");
      setConfirmDeleteId(null);
      return;
    }
    setConfirmDeleteId(null);
    reloadState();
  }

  function handleDeleteCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setErrorMsg(null);
  }

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
        <div className="w-8" />
      </div>

      {/* 에러 메시지 */}
      {errorMsg && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-xs leading-relaxed whitespace-pre-line">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-red-400/60 text-xs mt-1 hover:text-red-400">닫기</button>
        </div>
      )}

      {/* 작품 목록 */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {appState.stories.map((story: Story) => {
          const mainUniverse = story.universes.find((u) => u.isMain) ?? story.universes[0];
          const totalEpisodes = mainUniverse.episodes.length;
          const totalUniverses = story.universes.length;
          const isMyStory = myNickname && myNickname === story.author;
          const isConfirming = confirmDeleteId === story.id;
          const hasRemix = story.universes.some((u) => !u.isMain);
          const coverImage = (story as any).coverImageUrl || null;

          return (
            <div
              key={story.id}
              className={`relative rounded-2xl overflow-hidden border border-white/5 transition-all ${
                isConfirming ? "opacity-70" : "cursor-pointer active:scale-98"
              }`}
              onClick={() => {
                if (isConfirming) return;
                router.push(`/reader/${story.id}/0`);
              }}
            >
              {/* 배경 이미지 또는 컬러 */}
              <div className="relative h-36">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={story.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${story.coverColor} 0%, #000 100%)`,
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* 장르 배지 */}
                <div className="absolute top-3 left-3">
                  <span className="text-white/60 text-xs bg-black/50 px-2 py-1 rounded-full border border-white/10">
                    {story.genre}
                  </span>
                </div>

                {/* 작가 삭제 버튼 */}
                {isMyStory && (
                  <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                    {!isConfirming && (
                      <button
                        onClick={(e) => handleDeleteClick(e, story.id)}
                        disabled={hasRemix}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                          hasRemix
                            ? "text-white/10 border-white/5 cursor-not-allowed"
                            : "text-red-400/50 border-red-400/20 hover:text-red-400 hover:border-red-400/40 bg-black/40"
                        }`}
                      >
                        {hasRemix ? "🔒" : "🗑"}
                      </button>
                    )}
                    {isConfirming && (
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => handleDeleteConfirm(e, story.id)}
                          className="text-xs text-red-400 px-2 py-1 rounded-lg border border-red-400/40 bg-black/60 hover:bg-red-400/10"
                        >
                          삭제
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          className="text-xs text-white/40 px-2 py-1 rounded-lg border border-white/10 bg-black/60"
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 하단 텍스트 */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                  <h2 className="text-white font-bold text-lg leading-tight">
                    {story.title}
                  </h2>
                  <p className="text-white/40 text-xs mt-0.5">by {story.author}</p>
                </div>
              </div>

              {/* 하단 정보 */}
              <div className="px-4 py-3 bg-zinc-950 flex items-center justify-between">
                <p className="text-white/50 text-sm leading-relaxed line-clamp-1 flex-1 mr-4">
                  {story.hook}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-white/20 text-xs">{totalEpisodes}화</span>
                  {totalUniverses > 1 && (
                    <span className="text-white/20 text-xs">· U{totalUniverses}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
