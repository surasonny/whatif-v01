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
          <p className="text-red-400 text-xs leading-relaxed whitespace-pre-line">
            {errorMsg}
          </p>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400/60 text-xs mt-1 hover:text-red-400"
          >
            닫기
          </button>
        </div>
      )}

      {/* 작품 목록 */}
      <div className="px-6 py-4">
        {appState.stories.map((story: Story) => {
          const mainUniverse = story.universes.find((u) => u.isMain) ?? story.universes[0];
          const totalEpisodes = mainUniverse.episodes.length;
          const totalUniverses = story.universes.length;
          const isMyStory = myNickname && myNickname === story.author;
          const isConfirming = confirmDeleteId === story.id;
          const hasRemix = story.universes.some((u) => !u.isMain);

          return (
            <div
              key={story.id}
              className="relative flex items-start gap-4 py-5 border-b border-white/10 -mx-6 px-6"
            >
              {/* 카드 클릭 영역 — 삭제 확인 중엔 이동 막기 */}
              <div
                className={`flex items-start gap-4 flex-1 ${
                  isConfirming ? "opacity-50" : "cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10"
                }`}
                onClick={() => {
                  if (isConfirming) return;
                  router.push(`/reader/${story.id}/0`);
                }}
              >
                {/* 컬러 블록 */}
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

              {/* 작가 전용 삭제 버튼 영역 */}
              {isMyStory && (
                <div className="flex-shrink-0 flex flex-col items-end justify-start pt-1 gap-2">
                  {!isConfirming && (
                    <button
                      onClick={(e) => handleDeleteClick(e, story.id)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        hasRemix
                          ? "text-white/10 border-white/5 cursor-not-allowed"
                          : "text-red-400/40 border-red-400/10 hover:text-red-400/80 hover:border-red-400/30"
                      }`}
                      title={hasRemix ? "리믹스가 있어 삭제 불가" : "작품 삭제"}
                      disabled={hasRemix}
                    >
                      {hasRemix ? "🔒" : "🗑"}
                    </button>
                  )}

                  {isConfirming && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-white/40 text-xs">삭제할까요?</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => handleDeleteConfirm(e, story.id)}
                          className="text-xs text-red-400 px-2 py-1 rounded border border-red-400/40 hover:bg-red-400/10 transition-colors"
                        >
                          삭제
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          className="text-xs text-white/40 px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
