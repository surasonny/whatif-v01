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
  const genreColor = GENRE_COLORS[story.genre] || "#6b7280";

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-screen overflow-hidden select-none relative"
        style={{ touchAction: "none" }}
      >
        <img
          key={story.id}
          src={(story.universes[0]?.episodes[0] as any)?.coverImageUrl || `https://picsum.photos/seed/${story.id}-home/800/1200`}
          alt={story.title}
          onLoad={() => setImgLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: imgLoaded ? 1 : 0 }}
          draggable={false}
        />
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{ backgroundColor: story.coverColor }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* 상단 */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-6">
          <span className="text-white font-bold text-xl tracking-tight">What If</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNicknameSetup(true)}
              className="text-white/40 text-xs hover:text-white transition-colors"
            >
              {nickname ? `@${nickname}` : "닉네임 설정"}
            </button>
            <button
              onClick={() => router.push("/stories")}
              className="text-white/40 text-xs hover:text-white transition-colors"
            >
              전체 →
            </button>
          </div>
        </div>

        {/* 카드 콘텐츠 */}
        <div className="absolute inset-0 flex flex-col justify-end px-6 pb-16">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                backgroundColor: `${genreColor}33`,
                color: genreColor,
                border: `1px solid ${genreColor}66`,
              }}
            >
              {story.genre}
            </span>
            <span className="text-white/30 text-xs">총 {totalEpisodes}화</span>
            {totalUniverses > 1 && (
              <>
                <span className="text-white/20 text-xs">·</span>
                <span className="text-white/30 text-xs">유니버스 {totalUniverses}개</span>
              </>
            )}
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-2 tracking-tight">
            {story.title}
          </h1>
          <p className="text-sm text-white/50 mb-5">by {story.author}</p>
          <p className="text-base text-white/80 leading-relaxed mb-8 max-w-sm">
            {story.hook}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/reader/${story.id}/0`)}
              className="flex-1 py-4 rounded-2xl bg-white text-black font-bold text-sm tracking-wide hover:bg-white/90 active:scale-95 transition-all"
            >
              1화부터 읽기
            </button>
            <button
              onClick={() => router.push("/write/new")}
              className="px-5 py-4 rounded-2xl border border-white/20 text-white/60 text-sm font-medium hover:border-white/50 hover:text-white active:scale-95 transition-all"
            >
              ✍️ 새 작품
            </button>
          </div>
        </div>

        {/* 인디케이터 */}
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

        {currentIndex === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <p className="text-white/25 text-xs tracking-widest">↕ 스와이프하여 다음 작품</p>
          </div>
        )}
      </div>

      {showNicknameSetup && (
        <NicknameSetup onClose={() => setShowNicknameSetup(false)} />
      )}
    </>
  );
}
