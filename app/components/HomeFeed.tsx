"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppState, Story } from "@/lib/types";
import { useAuth } from "@/app/components/AuthProvider";

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
  const { user, nickname: authNickname, loading: authLoading, signOut, openAuthModal } = useAuth();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

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
      setMounted(true);
    }
    init();
  }, []);

  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const mainLikes = mainUniverse.episodes.reduce((s, e) => s + e.likes, 0);
  const isCanonWar = story.universes.some((u) => {
    if (u.isMain) return false;
    const uLikes = u.episodes.reduce((s, e) => s + e.likes, 0);
    return uLikes > 0 && (mainLikes === 0 || uLikes / mainLikes >= 1.5);
  });

  const recentlyTransferred = !!(story.mainHistory &&
    story.mainHistory.length > 0 &&
    (new Date().getTime() - new Date((story.mainHistory as any[])[story.mainHistory.length - 1].date).getTime())
    < 1000 * 60 * 60 * 24);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden select-none relative bg-black"
      style={{ touchAction: "none", height: "100dvh" }}
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

      {/* 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />

      {/* 상단 바 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 pt-safe py-5">
        <span className="text-white font-black text-2xl tracking-tighter">
          What If
        </span>
        <div className="flex items-center gap-3">
          {!authLoading && (
            user ? (
              <>
                <span className="text-white/50 text-xs">
                  {authNickname ?? user.email?.split("@")[0]} 님
                </span>
                <button
                  onClick={signOut}
                  className="text-white/35 text-xs hover:text-white transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={openAuthModal}
                className="text-white/50 text-xs hover:text-white transition-colors"
              >
                로그인
              </button>
            )
          )}
          <button
            onClick={() => router.push("/stories")}
            className="text-white/50 text-xs hover:text-white transition-colors"
          >
            전체 →
          </button>
        </div>
      </div>

      {/* 카드 콘텐츠 — 하단 */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-5" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>
        {/* 장르 + 통계 */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: `${genreColor}25`,
              color: genreColor,
              border: `1px solid ${genreColor}50`,
            }}
          >
            {story.genre}
          </span>
          {isCanonWar && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-400/20 text-red-400 border border-red-400/30 animate-pulse">
              ⚔ 정사대전 중
            </span>
          )}
          {recentlyTransferred && !isCanonWar && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">
              🔥 정사 교체됨
            </span>
          )}
          <span className="text-white/30 text-xs">{totalEpisodes}화</span>
          {totalUniverses > 1 && (
            <span className="text-white/30 text-xs">· 유니버스 {totalUniverses}개</span>
          )}
        </div>

        {/* 제목 */}
        <h1 className="text-white font-black text-3xl leading-tight mb-1 tracking-tight line-clamp-2">
          {story.title}
        </h1>

        {/* 작가 */}
        <p className="text-white/40 text-xs mb-4">by {story.author}</p>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/reader/${story.id}/0`)}
            className="flex-1 py-3 rounded-2xl bg-white text-black font-bold text-sm tracking-wide hover:bg-white/90 active:scale-95 transition-all"
          >
            1화부터 읽기
          </button>
          <button
            onClick={() => router.push("/write/new")}
            className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 active:scale-95 transition-all"
          >
            ✍️
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
  );
}
