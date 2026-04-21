"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppState, Story } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { useMyNickname } from "@/app/components/AuthorModeToggle";
import NicknameSetup from "@/app/components/AuthorModeToggle";

const GENRE_COLORS: Record<string, string> = {
  SF: "#3b82f6",
  판타지: "#8b5cf6",
  로맨스: "#ec4899",
  일상: "#f59e0b",
  스릴러: "#ef4444",
  미스터리: "#6366f1",
  드라마: "#f97316",
  액션: "#22c55e",
  호러: "#a855f7",
  역사: "#d97706",
  무협: "#ef4444",
  스포츠: "#3b82f6",
  음악: "#ec4899",
  요리: "#f59e0b",
  여행: "#06b6d4",
  "현대판타지": "#06b6d4",
  "코미디": "#f59e0b",
};

export default function HomeFeed() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showNicknameSetup, setShowNicknameSetup] = useState(false);
  const { nickname } = useMyNickname();

  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setMounted(true);
  }, []);

  useEffect(() => {
    setImgLoaded(false);
  }, [currentIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      startYRef.current = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (startYRef.current === null) return;
      const diff = startYRef.current - e.clientY;
      startYRef.current = null;
      if (!appState) return;
      const total = appState.stories.length;
      if (diff > 50) {
        setCurrentIndex((prev) => Math.min(prev + 1, total - 1));
      } else if (diff < -50) {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [appState]);

  if (!mounted || !appState) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white text-sm opacity-50">불러오는 중...</p>
      </div>
    );
  }

  const story: Story = appState.stories[currentIndex];
  const mainUniverse = story.universes.find((u) => u.isMain) ?? story.universes[0];
  const totalEpisodes = mainUniverse.episodes.length;
  const totalUniverses = story.universes.length;
  const firstGenre = story.genre.split("/")[0];
  const genreColor = GENRE_COLORS[firstGenre] || "#6b7280";
  const bgImageUrl: string | null =
    (story as any).coverImageUrl
    ?? mainUniverse.episodes[0]?.coverImageUrl
    ?? null;

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-screen overflow-hidden select-none relative bg-black"
        style={{ touchAction: "none" }}
      >
        {/* 배경 이미지 */}
        {bgImageUrl && (
          <img
            key={story.id}
            src={bgImageUrl}
            alt={story.title}
            onLoad={() => setImgLoaded(true)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            draggable={false}
          />
        )}

        {/* 배경 없으면 그라디언트 */}
        {!bgImageUrl && (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, ${story.coverColor} 0%, #000000 100%)`,
            }}
          />
        )}

        {/* 오버레이 — 위는 어둡게, 아래는 더 어둡게 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />

        {/* 상단 바 */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 pt-safe py-5">
          <span className="text-white font-black text-2xl tracking-tighter">
            What If
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNicknameSetup(true)}
              className="text-white/50 text-xs hover:text-white transition-colors"
            >
              {nickname ? `@${nickname}` : "닉네임 설정"}
            </button>
            <button
              onClick={() => router.push("/stories")}
              className="text-white/50 text-xs hover:text-white transition-colors"
            >
              전체 →
            </button>
          </div>
        </div>

        {/* 카드 콘텐츠 — 하단 */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-6">

          {/* 장르 + 통계 */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{
                backgroundColor: `${genreColor}25`,
                color: genreColor,
                border: `1px solid ${genreColor}50`,
              }}
            >
              {story.genre}
            </span>
            <span className="text-white/30 text-xs">{totalEpisodes}화</span>
            {totalUniverses > 1 && (
              <span className="text-white/30 text-xs">· 유니버스 {totalUniverses}개</span>
            )}
          </div>

          {/* 제목 */}
          <h1 className="text-white font-black text-4xl leading-none mb-2 tracking-tight">
            {story.title}
          </h1>

          {/* 작가 */}
          <p className="text-white/40 text-sm mb-4">by {story.author}</p>

          {/* 훅 */}
          <p className="text-white/70 text-base leading-relaxed mb-6 max-w-sm">
            {story.hook}
          </p>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/reader/${story.id}/0`)}
              className="flex-1 py-4 rounded-2xl bg-white text-black font-bold text-sm tracking-wide hover:bg-white/90 active:scale-95 transition-all"
            >
              1화부터 읽기
            </button>
            <button
              onClick={() => router.push("/write/new")}
              className="px-5 py-4 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 active:scale-95 transition-all backdrop-blur-sm"
            >
              ✍️ 새 작품
            </button>
          </div>
        </div>

        {/* 우측 인디케이터 */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          {appState.stories.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-1 rounded-full transition-all duration-300 ${
                i === currentIndex ? "h-8 bg-white" : "h-2 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* 스와이프 힌트 */}
        {currentIndex === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <p className="text-white/20 text-xs tracking-widest animate-pulse">
              ↕ 스와이프
            </p>
          </div>
        )}
      </div>

      {showNicknameSetup && (
        <NicknameSetup onClose={() => setShowNicknameSetup(false)} />
      )}
    </>
  );
}
