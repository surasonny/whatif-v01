"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppState, Story, Universe, Episode, Comment } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { saveState } from "@/lib/store";
import CommentSection from "@/app/components/CommentSection";
import SnapshotCard from "@/app/components/SnapshotCard";

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

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setEpisodeIndex(parseInt(episodeParam) || 0);
    setMounted(true);
  }, [episodeParam]);

  useEffect(() => {
    if (!appState) return;
    const story = appState.stories.find((s) => s.id === storyId);
    if (!story) return;

    let startX = 0;
    let startY = 0;
    let moved = false;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      moved = false;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = startX - endX;
      const diffY = startY - endY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      // 수평이 수직보다 크고 40px 이상일 때만 회차 이동
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

    // PC 마우스용
    const onMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
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

  return (
    <>
      <div
        className="w-full bg-black flex flex-col"
        style={{ height: "100dvh" }}
      >

        {/* 상단 바 — 고정 */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 z-20">
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
          <div className="flex items-center gap-3">
            <div className="text-white/40 text-xs text-right">
              <p>{episodeIndex + 1} / {totalEpisodes}화</p>
              {totalUniverses > 1 && (
                <p>U{universeIndex + 1}/{totalUniverses}</p>
              )}
            </div>
            <button
              onClick={() => setShowSnapshot(true)}
              className="text-white/30 text-base hover:text-white transition-colors"
            >
              📸
            </button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto">

          {/* 커버 이미지 */}
          <div className="relative w-full" style={{ height: 320 }}>
            <img
              src={`https://picsum.photos/seed/${story.id}/800/640`}
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

          {/* 본문 */}
          <div className="px-6 pb-8">
            <div className="max-w-prose mx-auto">
              <div className="text-white/90 text-base leading-8 whitespace-pre-wrap pt-6">
                {episode.content}
              </div>

              {/* 좋아요/싫어요 */}
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

              {/* 리믹스 버튼 */}
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

              {/* 댓글 */}
              <CommentSection
                comments={appState.comments}
                storyId={storyId}
                universeId={universe.id}
                episodeIndex={episodeIndex}
                onAddComment={handleAddComment}
                onLikeComment={handleLikeComment}
                onDislikeComment={handleDislikeComment}
              />
            </div>
          </div>
        </div>

        {/* 하단 바 — 고정 */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black z-20">
          <button
            onClick={() => setEpisodeIndex((prev) => Math.max(prev - 1, 0))}
            disabled={episodeIndex === 0}
            className="text-white/40 text-sm disabled:opacity-20 hover:text-white transition-colors px-4 py-2"
          >
            ← 이전 화
          </button>

          {/* 유니버스 전환 버튼 */}
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

          {/* 회차 인디케이터 */}
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

      {/* 스냅샷 팝업 */}
      {showSnapshot && (
        <SnapshotCard
          story={story}
          universe={universe}
          episode={episode}
          onClose={() => setShowSnapshot(false)}
        />
      )}
    </>
  );
}
