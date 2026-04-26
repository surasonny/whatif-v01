"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AppState, Story } from "@/lib/types";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import LikeFloating from "@/app/components/LikeFloating";
import EventFeed from "@/app/components/EventFeed";

// ── 정사대전 임계값 ──────────────────────────────────────────────
const CHALLENGE_THRESHOLD = 1.5;
const TRANSFER_THRESHOLD  = 2.0;

const GENRE_COLORS: Record<string, string> = {
  SF: "#3b82f6", 판타지: "#8b5cf6", 로맨스: "#ec4899", 일상: "#f59e0b",
  스릴러: "#ef4444", 미스터리: "#6366f1", 드라마: "#f97316", 액션: "#22c55e",
  호러: "#a855f7", 역사: "#d97706", 무협: "#ef4444", 스포츠: "#3b82f6",
  음악: "#ec4899", 요리: "#f59e0b", 여행: "#06b6d4", 현대판타지: "#06b6d4",
  코미디: "#f59e0b",
};

// ── 정사대전 지표 계산 ────────────────────────────────────────────
interface BattleInfo {
  battleStatus: "active" | "none";
  mainLikes: number;
  challengerLikes: number;
  challengerLabel: string;
  gapToTransfer: number;
  progressPct: number;
  battleRank: number | null;
}

function computeBattle(story: Story): Omit<BattleInfo, "battleRank"> {
  const mainU = story.universes.find((u) => u.isMain) ?? story.universes[0];
  const mainLikes = mainU.episodes.reduce((s, e) => s + e.likes, 0);

  let topLikes = 0;
  let topLabel = "";
  for (const u of story.universes) {
    if (u.isMain) continue;
    const likes = u.episodes.reduce((s, e) => s + e.likes, 0);
    if (likes > topLikes) { topLikes = likes; topLabel = u.label; }
  }

  const isActive = mainLikes > 0 && topLikes >= mainLikes * CHALLENGE_THRESHOLD;
  const gapToTransfer = Math.max(0, Math.round(mainLikes * TRANSFER_THRESHOLD - topLikes));
  const progressPct = mainLikes > 0
    ? Math.min((topLikes / (mainLikes * TRANSFER_THRESHOLD)) * 100, 100)
    : 0;

  return {
    battleStatus: isActive ? "active" : "none",
    mainLikes,
    challengerLikes: topLikes,
    challengerLabel: topLabel,
    gapToTransfer,
    progressPct,
  };
}

type SortedStory = Story & BattleInfo;

function sortStories(stories: Story[]): SortedStory[] {
  const withBattle = stories.map((s) => ({ ...s, ...computeBattle(s), battleRank: null as number | null }));

  const active = withBattle
    .filter((s) => s.battleStatus === "active")
    .sort((a, b) => a.gapToTransfer - b.gapToTransfer)
    .slice(0, 3)
    .map((s, i) => ({ ...s, battleRank: i + 1 }));

  const activeIds = new Set(active.map((s) => s.id));
  const rest = withBattle.filter((s) => !activeIds.has(s.id));

  return [...active, ...rest];
}

// ── 주간 챔피언 ───────────────────────────────────────────────────
async function loadWeeklyChampion(stories: Story[]): Promise<string | null> {
  const now = new Date();
  const day = now.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("main_transfers")
    .select("story_id")
    .gte("transferred_at", weekStart.toISOString());

  if (!data || data.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const row of data as { story_id: string }[]) {
    counts[row.story_id] = (counts[row.story_id] ?? 0) + 1;
  }
  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!topId) return null;

  return stories.find((s) => s.id === topId)?.title ?? null;
}

// ── HomeFeed ──────────────────────────────────────────────────────
export default function HomeFeed() {
  const router = useRouter();
  const { user, nickname: authNickname, loading: authLoading, signOut, openAuthModal } = useAuth();

  const [appState, setAppState]         = useState<AppState | null>(null);
  const [sortedStories, setSortedStories] = useState<SortedStory[]>([]);
  const [mounted, setMounted]           = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgLoaded, setImgLoaded]       = useState(false);
  const [weeklyChampion, setWeeklyChampion] = useState<string | null>(null);
  const [likeFloats, setLikeFloats]     = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    async function init() {
      const { loadStateFromSupabase, seedSupabaseIfEmpty } = await import("@/lib/supabaseStore");
      const { SEED_DATA } = await import("@/lib/seed");

      let state = await loadStateFromSupabase();
      if (!state || state.stories.length === 0) {
        await seedSupabaseIfEmpty(SEED_DATA.stories);
        state = await loadStateFromSupabase();
      }
      if (!state || state.stories.length === 0) {
        const { seedIfEmpty } = await import("@/lib/seed");
        state = seedIfEmpty();
      }

      setAppState(state);
      setSortedStories(sortStories(state.stories));

      const champion = await loadWeeklyChampion(state.stories);
      setWeeklyChampion(champion);

      setMounted(true);
    }
    init();
  }, []);

  useEffect(() => { setImgLoaded(false); }, [currentIndex]);

  // ── 스와이프 ────────────────────────────────────────────────────
  const startYRef    = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !appState) return;

    const onPointerDown = (e: PointerEvent) => { startYRef.current = e.clientY; };
    const onPointerUp   = (e: PointerEvent) => {
      if (startYRef.current === null) return;
      const diff = startYRef.current - e.clientY;
      startYRef.current = null;
      const total = sortedStories.length;
      if (diff > 50)       setCurrentIndex((p) => Math.min(p + 1, total - 1));
      else if (diff < -50) setCurrentIndex((p) => Math.max(p - 1, 0));
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [appState, sortedStories.length]);

  // ── 좋아요 ──────────────────────────────────────────────────────
  function addLikeFloat(x: number, y: number) {
    const id = Date.now();
    setLikeFloats((p) => [...p, { id, x, y }]);
    setTimeout(() => setLikeFloats((p) => p.filter((f) => f.id !== id)), 1100);
  }

  async function handleLike(story: SortedStory, e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) { openAuthModal(); return; }
    if (!appState) return;

    const mainU = story.universes.find((u) => u.isMain) ?? story.universes[0];
    const lastIdx = mainU.episodes.length - 1;

    const updatedStories = appState.stories.map((s) => {
      if (s.id !== story.id) return s;
      return {
        ...s,
        universes: s.universes.map((u) => {
          if (!u.isMain) return u;
          return {
            ...u,
            episodes: u.episodes.map((ep, ei) =>
              ei === lastIdx ? { ...ep, likes: ep.likes + 1 } : ep
            ),
          };
        }),
      };
    });

    const newState = { ...appState, stories: updatedStories };
    setAppState(newState);
    setSortedStories(sortStories(updatedStories));
    addLikeFloat(e.clientX, e.clientY);

    const { saveState } = await import("@/lib/store");
    saveState(newState);
    const { saveStoryToSupabase } = await import("@/lib/supabaseStore");
    const updated = updatedStories.find((s) => s.id === story.id);
    if (updated) saveStoryToSupabase(updated);
  }

  if (!mounted || !appState || sortedStories.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white text-sm opacity-50">불러오는 중...</p>
      </div>
    );
  }

  const story = sortedStories[currentIndex];
  const mainUniverse  = story.universes.find((u) => u.isMain) ?? story.universes[0];
  const totalEpisodes = mainUniverse.episodes.length;
  const totalLikes    = mainUniverse.episodes.reduce((s, e) => s + e.likes, 0);
  const firstGenre    = story.genre.split("/")[0];
  const genreColor    = GENRE_COLORS[firstGenre] || "#6b7280";
  const bgImageUrl: string | null =
    (story as any).coverImageUrl ?? mainUniverse.episodes[0]?.coverImageUrl ?? null;

  const recentlyTransferred = !!(
    story.mainHistory?.length &&
    Date.now() - new Date((story.mainHistory as any[])[story.mainHistory.length - 1].date).getTime() < 86400000
  );

  return (
    <>
      <div
        ref={containerRef}
        className="w-full overflow-hidden select-none relative bg-black"
        style={{ touchAction: "none", height: "100dvh" }}
      >
        {/* 배경 */}
        {bgImageUrl ? (
          <img
            key={story.id}
            src={bgImageUrl}
            alt={story.title}
            onLoad={() => setImgLoaded(true)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(160deg, ${story.coverColor} 0%, #000000 100%)` }}
          />
        )}

        {/* 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />

        {/* 정사대전 1위 — 테두리 강조 */}
        {story.battleRank === 1 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 0 0 2px rgba(249,115,22,0.5), inset 0 0 80px rgba(249,115,22,0.12)" }}
          />
        )}

        {/* ── 상단 영역 ─────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 z-10">
          {/* 로고 + 인증 바 */}
          <div className="flex items-center justify-between px-6 pt-safe py-5">
            <span className="text-white font-black text-2xl tracking-tighter">What If</span>
            <div className="flex items-center gap-3">
              {!authLoading && (
                user ? (
                  <>
                    <span className="text-white/50 text-xs">{authNickname ?? user.email?.split("@")[0]} 님</span>
                    <button onClick={signOut} className="text-white/35 text-xs hover:text-white transition-colors">로그아웃</button>
                  </>
                ) : (
                  <button onClick={openAuthModal} className="text-white/50 text-xs hover:text-white transition-colors">로그인</button>
                )
              )}
              <button onClick={() => router.push("/stories")} className="text-white/50 text-xs hover:text-white transition-colors">
                전체 →
              </button>
            </div>
          </div>

          {/* 주간 챔피언 */}
          {weeklyChampion && (
            <div className="mx-4 mb-1 px-3 py-1.5 rounded-xl flex items-center gap-2" style={{ backgroundColor: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", backdropFilter: "blur(8px)" }}>
              <span className="text-xs font-bold" style={{ color: "rgb(251,191,36)" }}>👑 이번 주 정사 챔피언</span>
              <span className="text-xs font-semibold truncate" style={{ color: "rgba(251,191,36,0.8)" }}>{weeklyChampion}</span>
            </div>
          )}

          {/* 최근 이벤트 피드 */}
          <EventFeed stories={appState.stories} />
        </div>

        {/* ── 하단 카드 콘텐츠 ──────────────────────────────── */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 px-5"
          style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}
        >
          {/* 배지 행 */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${genreColor}25`, color: genreColor, border: `1px solid ${genreColor}50` }}
            >
              {story.genre}
            </span>
            {story.battleStatus === "active" && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-400/20 text-red-400 border border-red-400/30 animate-pulse">
                ⚔ 정사대전 중
              </span>
            )}
            {recentlyTransferred && story.battleStatus !== "active" && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">
                🔥 정사 교체됨
              </span>
            )}
            <span className="text-white/30 text-xs">{totalEpisodes}화</span>
            {story.universes.length > 1 && (
              <span className="text-white/30 text-xs">· 유니버스 {story.universes.length}개</span>
            )}
          </div>

          {/* 1위 레이블 */}
          {story.battleRank === 1 && (
            <p className="text-xs font-bold mb-1" style={{ color: "rgba(249,115,22,0.9)" }}>
              🔥 지금 가장 뜨거운 작품
            </p>
          )}

          {/* 제목 */}
          <h1 className="text-white font-black text-3xl leading-tight mb-1 tracking-tight line-clamp-2">
            {story.title}
          </h1>

          {/* 작가 */}
          <p className="text-white/40 text-xs mb-3">by {story.author}</p>

          {/* 정사대전 진행률 바 */}
          {story.battleStatus === "active" && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold" style={{ color: "rgba(249,115,22,0.85)" }}>
                  {story.challengerLabel} 도전 중
                </span>
                <span className="text-xs" style={{ color: "rgba(249,115,22,0.7)" }}>
                  ⚔ 전환까지 {story.gapToTransfer}점
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${story.progressPct >= 80 ? "animate-pulse" : ""}`}
                  style={{
                    width: `${story.progressPct}%`,
                    background: "linear-gradient(to right, #f97316, #ef4444)",
                  }}
                />
              </div>
              <p className="text-right text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                {Math.round(story.progressPct)}%
              </p>
            </div>
          )}

          {/* 버튼 행 */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/reader/${story.id}/0`)}
              className="flex-1 py-3 rounded-2xl bg-white text-black font-bold text-sm tracking-wide hover:bg-white/90 active:scale-95 transition-all"
            >
              1화부터 읽기
            </button>
            <button
              onClick={(e) => handleLike(story, e)}
              className="px-4 py-3 rounded-2xl border text-sm font-medium active:scale-95 transition-all"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}
            >
              ❤️ {totalLikes}
            </button>
            <button
              onClick={() => router.push("/write/new")}
              className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 active:scale-95 transition-all"
            >
              ✍️
            </button>
          </div>

          {/* 리믹스 유도 — 정사대전 없는 작품 */}
          {story.battleStatus === "none" && (
            <button
              onClick={() => router.push(`/reader/${story.id}/0`)}
              className="w-full mt-2 py-2.5 rounded-2xl border text-sm font-medium active:scale-95 transition-all"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
            >
              ✦ 리믹스 도전하기
            </button>
          )}
        </div>

        {/* 우측 인디케이터 */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          {sortedStories.map((s, i) => (
            <button
              key={s.id}
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
            <p className="text-white/20 text-xs tracking-widest animate-pulse">↕ 스와이프</p>
          </div>
        )}
      </div>

      {likeFloats.map((f) => (
        <LikeFloating key={f.id} x={f.x} y={f.y} id={f.id} />
      ))}
    </>
  );
}
