"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppState, Story, Universe, Episode, Comment } from "@/lib/types";
import { saveState, loadState, deleteEpisode, deleteStory, checkCanonWar } from "@/lib/store";
import CommentSection from "@/app/components/CommentSection";
import SnapshotCard from "@/app/components/SnapshotCard";
import UniversePanel from "@/app/components/UniversePanel";
import { useMyNickname } from "@/app/components/AuthorModeToggle";

export default function ReaderClient() {
  const params = useParams();
  const router = useRouter();

  const storyId = params.storyId as string;
  const episodeParam = params.episode as string;

  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [universeIndex, setUniverseIndex] = useState(0);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showUniversePanel, setShowUniversePanel] = useState(false);
  const { nickname: myNickname } = useMyNickname();

  useEffect(() => {
    async function init() {
      const { loadStateFromSupabase, seedSupabaseIfEmpty } = await import("@/lib/supabaseStore");
      const { SEED_DATA } = await import("@/lib/seed");

      const supabaseState = await loadStateFromSupabase();
      if (supabaseState && supabaseState.stories.length > 0) {
        setAppState(supabaseState);
      } else {
        await seedSupabaseIfEmpty(SEED_DATA.stories);
        const retryState = await loadStateFromSupabase();
        if (retryState && retryState.stories.length > 0) {
          setAppState(retryState);
        } else {
          const { seedIfEmpty } = await import("@/lib/seed");
          const localState = seedIfEmpty();
          setAppState(localState);
        }
      }
      setEpisodeIndex(parseInt(episodeParam) || 0);
      setMounted(true);
    }
    init();
  }, [episodeParam]);

  useEffect(() => {
    if (!appState) return;
    const story = appState.stories.find((s) => s.id === storyId);
    if (!story) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = startX - endX;
      const diffY = startY - endY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (absX > absY && absX > 40) {
        const currentUniverse = story.universes[universeIndex];
        const maxEpisode = currentUniverse.episodes.length - 1;
        if (diffX > 0) {
          setEpisodeIndex((prev) => Math.min(prev + 1, maxEpisode));
        } else {
          setEpisodeIndex((prev) => Math.max(prev - 1, 0));
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;
    };

    const onMouseUp = (e: MouseEvent) => {
      const diffX = startX - e.clientX;
      const diffY = startY - e.clientY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (absX > absY && absX > 60) {
        const currentUniverse = story.universes[universeIndex];
        const maxEpisode = currentUniverse.episodes.length - 1;
        if (diffX > 0) {
          setEpisodeIndex((prev) => Math.min(prev + 1, maxEpisode));
        } else {
          setEpisodeIndex((prev) => Math.max(prev - 1, 0));
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [appState, storyId, universeIndex]);

  const handleLike = () => {
    if (!appState) return;
    const updated: AppState = {
      ...appState,
      stories: appState.stories.map((s) => {
        if (s.id !== storyId) return s;
        return {
          ...s,
          universes: s.universes.map((u, ui) => {
            if (ui !== universeIndex) return u;
            return {
              ...u,
              episodes: u.episodes.map((ep, ei) => {
                if (ei !== episodeIndex) return ep;
                return { ...ep, likes: ep.likes + 1 };
              }),
            };
          }),
        };
      }),
    };
    setAppState(updated);
    saveState(updated);
    checkCanonWar(storyId);
    import("@/lib/supabaseStore").then(({ saveStoryToSupabase }) => {
      const updatedStory = updated.stories.find((s: any) => s.id === storyId);
      if (updatedStory) saveStoryToSupabase(updatedStory);
    });
  };

  const handleDislike = () => {
    if (!appState) return;
    const updated: AppState = {
      ...appState,
      stories: appState.stories.map((s) => {
        if (s.id !== storyId) return s;
        return {
          ...s,
          universes: s.universes.map((u, ui) => {
            if (ui !== universeIndex) return u;
            return {
              ...u,
              episodes: u.episodes.map((ep, ei) => {
                if (ei !== episodeIndex) return ep;
                return { ...ep, dislikes: ep.dislikes + 1 };
              }),
            };
          }),
        };
      }),
    };
    setAppState(updated);
    saveState(updated);
    import("@/lib/supabaseStore").then(({ saveStoryToSupabase }) => {
      const updatedStory = updated.stories.find((s: any) => s.id === storyId);
      if (updatedStory) saveStoryToSupabase(updatedStory);
    });
  };

  const handleAddComment = (content: string, author: string) => {
    if (!appState) return;
    const story = appState.stories.find((s) => s.id === storyId);
    if (!story) return;
    const universe = story.universes[universeIndex];
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      storyId,
      universeId: universe.id,
      episodeIndex,
      author,
      content,
      likes: 0,
      dislikes: 0,
      createdAt: new Date().toISOString(),
    };
    const updated: AppState = {
      ...appState,
      comments: [...appState.comments, newComment],
    };
    setAppState(updated);
    saveState(updated);
    import("@/lib/supabaseStore").then(({ saveCommentToSupabase }) => {
      saveCommentToSupabase(newComment);
    });
  };

  const handleLikeComment = (commentId: string) => {
    if (!appState) return;
    const updated: AppState = {
      ...appState,
      comments: appState.comments.map((c) =>
        c.id === commentId ? { ...c, likes: c.likes + 1 } : c
      ),
    };
    setAppState(updated);
    saveState(updated);
    import("@/lib/supabaseStore").then(({ saveCommentToSupabase }) => {
      const updatedComment = updated.comments.find((c: any) => c.id === commentId);
      if (updatedComment) saveCommentToSupabase(updatedComment);
    });
  };

  const handleDislikeComment = (commentId: string) => {
    if (!appState) return;
    const updated: AppState = {
      ...appState,
      comments: appState.comments.map((c) =>
        c.id === commentId ? { ...c, dislikes: c.dislikes + 1 } : c
      ),
    };
    setAppState(updated);
    saveState(updated);
    import("@/lib/supabaseStore").then(({ saveCommentToSupabase }) => {
      const updatedComment = updated.comments.find((c: any) => c.id === commentId);
      if (updatedComment) saveCommentToSupabase(updatedComment);
    });
  };

  const handleDeleteEpisode = () => {
    if (!appState) return;
    const story = appState.stories.find((s) => s.id === storyId);
    if (!story) return;
    const universe = story.universes[universeIndex];

    if (!confirm("이 화를 삭제할까요?")) return;

    const result = deleteEpisode(storyId, universe.id, episodeIndex);
    if (!result.ok) {
      alert(result.reason ?? "삭제할 수 없습니다.");
      return;
    }
    const fresh = loadState();
    if (fresh) {
      setAppState(fresh);
      import("@/lib/supabaseStore").then(({ saveStoryToSupabase }) => {
        const updatedStory = fresh.stories.find((s: any) => s.id === storyId);
        if (updatedStory) saveStoryToSupabase(updatedStory);
      });
    }
    setEpisodeIndex(Math.max(0, episodeIndex - 1));
  };

  const handleDeleteStory = () => {
    if (!appState) return;
    const story = appState.stories.find((s) => s.id === storyId);
    if (!story) return;

    if (!confirm(`"${story.title}" 작품 전체를 삭제할까요? 되돌릴 수 없습니다.`)) return;

    const result = deleteStory(storyId);
    if (!result.ok) {
      alert(result.reason ?? "삭제할 수 없습니다.");
      return;
    }
    import("@/lib/supabaseStore").then(({ deleteStoryFromSupabase }) => {
      deleteStoryFromSupabase(storyId);
    });
    router.push("/");
  };

  const handleUniverseDeleted = () => {
    const fresh = loadState();
    if (fresh) setAppState(fresh);
    setUniverseIndex(0);
  };

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

  const universe: Universe = story.universes[universeIndex] ?? story.universes[0];
  const episode: Episode = universe.episodes[episodeIndex] ?? universe.episodes[0];
  const totalEpisodes = universe.episodes.length;
  const totalUniverses = story.universes.length;
  const canRemix = episode.remixAllowed;
  const isMyStory = myNickname && myNickname === story.author;

  return (
    <>
      <div className="w-full bg-black flex flex-col" style={{ height: "100dvh" }}>

        <div className="flex-shrink-0 z-20">
          {/* 1행: 홈 / 제목 / 화수+유니버스 */}
          <div className="flex items-center justify-between px-6 pt-4 pb-1">
            <button
              onClick={() => router.push("/")}
              className="text-white/50 text-sm hover:text-white transition-colors"
            >
              ← 홈
            </button>
            <div className="text-center">
              <p className="text-white/80 text-sm font-medium">{story.title}</p>
              <p className="text-white/40 text-xs">{universe.label}</p>
            </div>
            <div className="text-white/40 text-xs text-right">
              <p>{episodeIndex + 1} / {totalEpisodes}화</p>
              {totalUniverses > 1 && (
                <button
                  onClick={() => setShowUniversePanel(true)}
                  className="text-white/40 text-xs hover:text-white transition-colors"
                >
                  U{universeIndex + 1}/{totalUniverses} ▾
                </button>
              )}
            </div>
          </div>

          {/* 2행: 작가 전용 버튼 — 작가일 때만 표시 */}
          {isMyStory && (
            <div className="flex items-center justify-end gap-1.5 px-6 pb-1">
              {/* 원고 수정 */}
              <button
                onClick={() => router.push(`/write/${storyId}/${episodeIndex}`)}
                className="text-white/30 text-xs hover:text-white transition-colors px-2 py-1 rounded-lg border border-white/10 hover:border-white/30"
                title="원고 수정"
              >
                ✏️
              </button>

              {/* 새 화 추가 — 마지막 화에서만 표시 */}
              {episodeIndex === totalEpisodes - 1 && (
                <button
                  onClick={() => router.push(`/write/${storyId}/new`)}
                  className="text-white/40 text-xs hover:text-white transition-colors px-1.5 py-1 rounded border border-white/10 hover:border-white/30"
                  title="새 화 추가"
                >
                  ➕
                </button>
              )}

              {/* 홈 카드 대표 이미지 변경 — 1화에서만 */}
              {episodeIndex === 0 && (
                <label
                  className="text-white/30 text-xs hover:text-white transition-colors cursor-pointer px-2 py-1 rounded-lg border border-white/10 hover:border-white/30"
                  title="홈 카드 대표 이미지 변경"
                >
                  🖼
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !appState) return;
                      const formData = new FormData();
                      formData.append("file", file);
                      try {
                        const res = await fetch("/api/upload", {
                          method: "POST",
                          body: formData,
                        });
                        const data = await res.json();
                        if (data.url) {
                          const updated: AppState = {
                            ...appState,
                            stories: appState.stories.map((s) =>
                              s.id === storyId
                                ? { ...s, coverImageUrl: data.url }
                                : s
                            ),
                          };
                          setAppState(updated);
                          saveState(updated);
                          import("@/lib/supabaseStore").then(({ saveStoryToSupabase }) => {
                            const updatedStory = updated.stories.find((s: any) => s.id === storyId);
                            if (updatedStory) saveStoryToSupabase(updatedStory);
                          });
                        }
                      } catch (err) {
                        console.error("홈 카드 이미지 업로드 실패", err);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              )}

              {/* 이 화 삭제 */}
              <button
                onClick={handleDeleteEpisode}
                className="text-red-400/30 text-xs hover:text-red-400 transition-colors px-2 py-1 rounded-lg border border-red-400/10 hover:border-red-400/30"
                title="이 화 삭제"
              >
                🗑
              </button>

              {/* 작품 전체 삭제 — 리믹스 없을 때만 */}
              {totalUniverses === 1 && (
                <button
                  onClick={handleDeleteStory}
                  className="text-red-400/30 text-xs hover:text-red-400 transition-colors px-2 py-1 rounded-lg border border-red-400/10 hover:border-red-400/30"
                  title="작품 전체 삭제"
                >
                  ✕
                </button>
              )}

              {/* 스냅샷 */}
              <button
                onClick={() => setShowSnapshot(true)}
                className="text-white/30 text-xs hover:text-white transition-colors px-2 py-1 rounded-lg border border-white/10 hover:border-white/30"
              >
                📸
              </button>
            </div>
          )}

          {/* 작가 아닐 때 스냅샷 버튼만 */}
          {!isMyStory && (
            <div className="flex items-center justify-end px-6 pb-2">
              <button
                onClick={() => setShowSnapshot(true)}
                className="text-white/30 text-xs hover:text-white transition-colors px-2 py-1"
              >
                📸
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">

          {(() => {
            const coverImage = (episode as any).coverImageUrl || null;
            if (!coverImage) return null;
            return (
              <div className="relative w-full" style={{ height: 320 }}>
                <img
                  src={coverImage}
                  alt={story.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to bottom, ${story.coverColor}55 0%, transparent 40%, rgba(0,0,0,0.85) 100%)`,
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
                <div className="absolute bottom-8 left-6 right-6">
                  <span className="text-white/50 text-xs tracking-widest uppercase block mb-2">
                    {story.genre}
                  </span>
                  <h1 className="text-white text-2xl font-bold leading-tight mb-1">
                    {episode.title}
                  </h1>
                  <p className="text-white/50 text-xs">
                    {story.title} · by {story.author}
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="px-6 pb-8">
            <div className="max-w-prose mx-auto">
              {!(episode as any).coverImageUrl && (
                <div className="pt-6 pb-1">
                  <span className="text-white/30 text-xs tracking-widest uppercase block mb-2">
                    {story.genre}
                  </span>
                  <h1 className="text-white text-2xl font-bold leading-tight mb-1">
                    {episode.title}
                  </h1>
                  <p className="text-white/40 text-xs mb-6">
                    {story.title} · by {story.author}
                  </p>
                </div>
              )}
              <div className="text-white/85 text-[17px] leading-[1.9] whitespace-pre-wrap pt-4 font-light tracking-wide">
                {episode.content}
              </div>

              <div className="mt-12 mb-4 flex items-center gap-4">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/60 text-sm hover:border-white/50 hover:text-white transition-all active:scale-95"
                >
                  <span>👍</span>
                  <span>{episode.likes}</span>
                </button>
                <button
                  onClick={handleDislike}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/60 text-sm hover:border-white/50 hover:text-white transition-all active:scale-95"
                >
                  <span>👎</span>
                  <span>{episode.dislikes}</span>
                </button>
              </div>

              {canRemix && (
                <div className="mt-4 mb-8">
                  <button
                    onClick={() => router.push(`/remix/${storyId}/${episodeIndex}`)}
                    className="w-full py-3 rounded-xl border border-white/20 text-white/60 text-sm font-medium hover:border-white/50 hover:text-white transition-all active:scale-95"
                  >
                    ✦ 이 화에서 리믹스 하기
                  </button>
                </div>
              )}

              <CommentSection
                comments={appState.comments}
                storyId={storyId}
                universeId={universe.id}
                episodeIndex={episodeIndex}
                allUniverses={story.universes.map((u) => ({ id: u.id, label: u.label }))}
                onAddComment={handleAddComment}
                onLikeComment={handleLikeComment}
                onDislikeComment={handleDislikeComment}
              />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black z-20">
          <button
            onClick={() => setEpisodeIndex((prev) => Math.max(prev - 1, 0))}
            disabled={episodeIndex === 0}
            className="text-white/40 text-sm disabled:opacity-20 hover:text-white transition-colors px-4 py-2"
          >
            ← 이전 화
          </button>

          {totalUniverses > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUniverseIndex((prev) => Math.max(prev - 1, 0))}
                disabled={universeIndex === 0}
                className="text-white/30 text-xs disabled:opacity-20 hover:text-white transition-colors"
              >
                ↑
              </button>
              <span className="text-white/30 text-xs">
                {universeIndex + 1}/{totalUniverses}
              </span>
              <button
                onClick={() => setUniverseIndex((prev) => Math.min(prev + 1, totalUniverses - 1))}
                disabled={universeIndex === totalUniverses - 1}
                className="text-white/30 text-xs disabled:opacity-20 hover:text-white transition-colors"
              >
                ↓
              </button>
            </div>
          )}

          {totalUniverses === 1 && (
            <div className="flex gap-1">
              {universe.episodes.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === episodeIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => setEpisodeIndex((prev) => Math.min(prev + 1, totalEpisodes - 1))}
            disabled={episodeIndex === totalEpisodes - 1}
            className="text-white/40 text-sm disabled:opacity-20 hover:text-white transition-colors px-4 py-2"
          >
            다음 화 →
          </button>
        </div>
      </div>

      {showSnapshot && (
        <SnapshotCard
          story={story}
          universe={universe}
          episode={episode}
          onClose={() => setShowSnapshot(false)}
        />
      )}

      {showUniversePanel && (
        <UniversePanel
          story={story}
          currentUniverseIndex={universeIndex}
          comments={appState.comments}
          onSelect={(i) => setUniverseIndex(i)}
          onSetMain={(universeId) => {
            if (!appState) return;
            const updated: AppState = {
              ...appState,
              stories: appState.stories.map((s) => {
                if (s.id !== storyId) return s;
                return {
                  ...s,
                  universes: s.universes.map((u) => ({
                    ...u,
                    isMain: u.id === universeId,
                  })),
                };
              }),
            };
            setAppState(updated);
            saveState(updated);
            import("@/lib/supabaseStore").then(({ saveStoryToSupabase }) => {
              const updatedStory = updated.stories.find((s: any) => s.id === storyId);
              if (updatedStory) saveStoryToSupabase(updatedStory);
            });
          }}
          onClose={() => setShowUniversePanel(false)}
          onUniverseDeleted={handleUniverseDeleted}
        />
      )}
    </>
  );
}
