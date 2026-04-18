"use client";

import { useEffect, useState, useRef } from "react";
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

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setEpisodeIndex(parseInt(episodeParam) || 0);
    setMounted(true);
  }, [episodeParam]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !appState) return;

    const story = appState.stories.find((s) => s.id === storyId);
    if (!story) return;

    const onPointerDown = (e: PointerEvent) => {
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (startXRef.current === null || startYRef.current === null) return;
      const diffX = startXRef.current - e.clientX;
      const diffY = startYRef.current - e.clientY;
      startXRef.current = null;
      startYRef.current = null;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (absX > absY && absX > 50) {
        const currentUniverse = story.universes[universeIndex];
        const maxEpisode = currentUniverse.episodes.length - 1;
        if (diffX > 0) {
          setEpisodeIndex((prev) => Math.min(prev + 1, maxEpisode));
        } else {
          setEpisodeIndex((prev) => Math.max(prev - 1, 0));
        }
        return;
      }

      if (absY > absX && absY > 50) {
        const maxUniverse = story.universes.length - 1;
        if (diffY > 0) {
          setUniverseIndex((prev) => Math.min(prev + 1, maxUniverse));
        } else {
          setUniverseIndex((prev) => Math.max(prev - 1, 0));
        }
        return;
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
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

  // 커버 이미지용 패턴 — 커버 컬러 기반 그라디언트
  const coverGradient = `
    radial-gradient(ellipse at 30% 40%, ${story.coverColor}cc 0%, transparent 60%),
    radial-gradient(ellipse at 70% 60%, ${story.coverColor}88 0%, transparent 50%),
    radial-gradient(ellipse at 50% 20%, #ffffff08 0%, transparent 40%),
    linear-gradient(160deg, ${story.coverColor} 0%, #000000 100%)
  `;

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-screen bg-black overflow-hidden select-none"
        style={{ touchAction: "none" }}
      >
        {/* 상단 바 — 고정 */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
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
              title="스냅샷 카드 만들기"
            >
              📸
            </button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div className="absolute inset-0 overflow-y-auto pt-14 pb-24">

          {/* 커버 이미지 영역 */}
          <div
            className="relative w-full flex-shrink-0"
            style={{ height: 320 }}
          >
            {/* Picsum 실제 사진 */}
            <img
              src={`https://picsum.photos/seed/${story.id}/800/640`}
              alt={story.title}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />

            {/* 컬러 오버레이 — 작품 색상과 블렌딩 */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${story.coverColor}55 0%, transparent 40%, rgba(0,0,0,0.85) 100%)`,
              }}
            />

            {/* 하단 페이드 */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

            {/* 커버 텍스트 오버레이 */}
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

          {/* 본문 영역 */}
          <div className="px-6 pb-8">
            <div className="max-w-prose mx-auto">

              {/* 본문 텍스트 */}
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

        {/* 하단 바 */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black to-transparent">
          <button
            onClick={() => setEpisodeIndex((prev) => Math.max(prev - 1, 0))}
            disabled={episodeIndex === 0}
            className="text-white/40 text-sm disabled:opacity-20 hover:text-white transition-colors"
          >
            ← 이전 화
          </button>
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
          <button
            onClick={() => setEpisodeIndex((prev) => Math.min(prev + 1, totalEpisodes - 1))}
            disabled={episodeIndex === totalEpisodes - 1}
            className="text-white/40 text-sm disabled:opacity-20 hover:text-white transition-colors"
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