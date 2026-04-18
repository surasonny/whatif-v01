"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppState, Story } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";

export default function HomeFeed() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setMounted(true);
  }, []);

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

  // 메인 유니버스의 총 화수
  const mainUniverse = story.universes.find((u) => u.isMain) ?? story.universes[0];
  const totalEpisodes = mainUniverse.episodes.length;

  // 총 유니버스 수 (원작 포함)
  const totalUniverses = story.universes.length;

  const handleRead = () => {
    router.push(`/reader/${story.id}/0`);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden select-none"
      style={{ touchAction: "none" }}
    >
      {/* 배경 */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ backgroundColor: story.coverColor }}
      />

      {/* 그라디언트 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* 카드 콘텐츠 */}
      <div className="absolute inset-0 flex flex-col justify-end px-8 pb-20">

        {/* 장르 + 화수 + 유니버스 수 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium tracking-widest text-white/60 uppercase">
            {story.genre}
          </span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-xs text-white/40">
            총 {totalEpisodes}화
          </span>
          {totalUniverses > 1 && (
            <>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-xs text-white/40">
                유니버스 {totalUniverses}개
              </span>
            </>
          )}
        </div>

        {/* 제목 */}
        <h1 className="text-4xl font-bold text-white leading-tight mb-2">
          {story.title}
        </h1>

        {/* 작가명 */}
        <p className="text-sm text-white/50 mb-6">
          by {story.author}
        </p>

        {/* 훅 문장 */}
        <p className="text-lg text-white/90 leading-relaxed mb-10 max-w-sm">
          {story.hook}
        </p>

        {/* 버튼 영역 */}
        <div className="flex gap-3 max-w-xs">
          <button
            onClick={handleRead}
            className="flex-1 py-4 rounded-2xl bg-white text-black font-semibold text-base tracking-wide hover:bg-white/90 active:scale-95 transition-all"
          >
            1화부터 읽기
          </button>
          <button
            onClick={() => router.push("/stories")}
            className="px-5 py-4 rounded-2xl border border-white/30 text-white/70 text-sm font-medium hover:border-white/60 hover:text-white active:scale-95 transition-all"
          >
            목록
          </button>
        </div>
      </div>

      {/* 우측 인디케이터 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {appState.stories.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex ? "h-8 bg-white" : "h-2 bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* 상단 로고 + 목록 버튼 */}
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
        <span className="text-white font-bold text-xl tracking-tight">
          What If
        </span>
        <button
          onClick={() => router.push("/stories")}
          className="text-white/40 text-xs tracking-wide hover:text-white transition-colors"
        >
          전체 작품 →
        </button>
      </div>

      {/* 하단 스와이프 힌트 */}
      {currentIndex === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <p className="text-white/30 text-xs tracking-widest">
            위로 스와이프하여 다음 작품
          </p>
        </div>
      )}
    </div>
  );
}