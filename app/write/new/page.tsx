"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppState, Story, Universe, Episode } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { saveState } from "@/lib/store";
import { useMyNickname } from "@/app/components/AuthorModeToggle";
import ImageUploader from "@/app/components/ImageUploader";

const GENERAL_GENRES = [
  "SF", "판타지", "로맨스", "일상", "스릴러",
  "미스터리", "드라마", "액션", "호러", "역사",
  "무협", "스포츠", "음악", "요리", "여행",
];

const ADULT_GENRES = [
  "성인로맨스", "성인판타지", "성인드라마",
];

export default function NewStoryPage() {
  const router = useRouter();
  const { nickname } = useMyNickname();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"info" | "write">("info");

  // info 단계
  const [title, setTitle] = useState("");
  const [genres, setGenres] = useState<string[]>(["SF"]);
  const [hook, setHook] = useState("");
  const [authorName, setAuthorName] = useState("");

  // write 단계
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [aiDirection, setAiDirection] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    if (nickname) setAuthorName(nickname);
    setMounted(true);
  }, [nickname]);

  function toggleGenre(g: string) {
    if (ADULT_GENRES.includes(g)) {
      alert("성인 장르는 서비스 준비 중입니다.");
      return;
    }

    setGenres((prev) => {
      if (prev.includes(g)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== g);
      }
      if (prev.length >= 3) return prev;
      return [...prev, g];
    });
  }

  const genreString = genres.join("/");

  const handleAiGenerate = async () => {
    if (!title.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: title,
          previousEpisodes: [],
          currentEpisode: "",
          direction: aiDirection || `${genreString} 장르의 웹소설 1화. 독자를 몰입시키는 강렬한 오프닝.`,
        }),
      });
      const data = await res.json();
      if (data.content) setContent(data.content);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
      setShowAiInput(false);
    }
  };

  const handleCreate = () => {
    if (!appState || !title.trim() || !content.trim()) return;
    const author = authorName.trim() || nickname || "익명";

    const coverColors: Record<string, string> = {
      "SF": "#0f172a", "판타지": "#1a0a2e", "로맨스": "#1e1b4b",
      "일상": "#292524", "스릴러": "#0a0a0a", "미스터리": "#0d1117",
      "드라마": "#1a0f0f", "액션": "#0f1a0a", "호러": "#0a0f0a",
      "역사": "#1a1505", "무협": "#1a0f00", "스포츠": "#001a0a",
      "음악": "#0a001a", "요리": "#1a1000", "여행": "#001a1a",
    };

    const newEpisode: Episode = {
      index: 0,
      title: `${title} 1화`,
      remixAllowed: false,
      likes: 0,
      dislikes: 0,
      content,
      ...(coverImageUrl ? { coverImageUrl } : {}),
    } as Episode;

    const newUniverse: Universe = {
      id: `u-${Date.now()}`,
      label: "원작",
      isMain: true,
      branchFromEpisode: null,
      episodes: [newEpisode],
    };

    const newStory: Story = {
      id: `story-${Date.now()}`,
      title,
      genre: genreString,
      author,
      hook,
      coverColor: coverColors[genres[0]] ?? "#1a1a2e",
      ...(coverImageUrl ? { coverImageUrl } : {}),
      seedVersion: 0,
      universes: [newUniverse],
    };

    const updated: AppState = {
      ...appState,
      stories: [...appState.stories, newStory],
    };
    setAppState(updated);
    saveState(updated);
    router.push(`/reader/${newStory.id}/0`);
  };

  if (!mounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white/40 text-sm">불러오는 중...</p>
      </div>
    );
  }

  // ── INFO 단계 ──────────────────────────────────────
  if (step === "info") {
    return (
      <div className="w-full min-h-screen bg-black text-white">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <button
            onClick={() => router.back()}
            className="text-white/50 text-sm hover:text-white transition-colors"
          >
            ← 뒤로
          </button>
          <p className="text-white/80 text-sm font-medium">새 작품</p>
          <button
            onClick={() => {
              if (title.trim() && hook.trim()) setStep("write");
            }}
            disabled={!title.trim() || !hook.trim()}
            className="text-sm font-medium text-white/60 hover:text-white disabled:opacity-20 transition-colors"
          >
            다음 →
          </button>
        </div>

        <div className="px-6 py-8 flex flex-col gap-6 max-w-lg mx-auto">
          {/* 제목 */}
          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-2">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="작품 제목"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-base"
            />
          </div>

          {/* 작가명 */}
          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-2">작가명</label>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="작가 이름"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-base"
            />
          </div>

          {/* 장르 */}
          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-3">
              장르 <span className="text-white/20">(최대 3개)</span>
            </label>

            {/* 일반 장르 */}
            <p className="text-white/20 text-xs mb-2 tracking-widest">일반</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {GENERAL_GENRES.map((g) => {
                const selected = genres.includes(g);
                const maxed = genres.length >= 3 && !selected;
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    disabled={maxed}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selected
                        ? "bg-white text-black border-white font-medium"
                        : maxed
                        ? "border-white/5 text-white/20 cursor-not-allowed"
                        : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            {/* 성인 장르 */}
            <p className="text-white/20 text-xs mb-2 tracking-widest flex items-center gap-2">
              성인
              <span className="text-white/20 text-xs">🔞 19+</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ADULT_GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className="px-3 py-1.5 rounded-full text-sm border border-white/10 text-white/20 cursor-not-allowed"
                >
                  🔒 {g}
                </button>
              ))}
            </div>

            {genres.length > 0 && (
              <p className="text-white/30 text-xs mt-3">선택됨: {genreString}</p>
            )}
          </div>

          {/* 대표 이미지 */}
          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-3">
              대표 이미지 <span className="text-white/20">(선택 · 홈 카드 배경)</span>
            </label>
            <ImageUploader
              onUpload={(url) => setCoverImageUrl(url)}
              currentImageUrl={coverImageUrl}
              storyTitle={title}
              genre={genreString}
              episodeTitle="대표 이미지"
              content={title + " " + hook}
            />
          </div>

          {/* 한 줄 소개 */}
          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-2">한 줄 소개</label>
            <input
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="독자를 끌어당기는 한 문장"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-base"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── WRITE 단계 ─────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-black text-white">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <button
          onClick={() => setStep("info")}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          ← 뒤로
        </button>
        <div className="text-center">
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-white/30 text-xs">1화 작성</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={!content.trim()}
          className="text-sm font-medium text-white/60 hover:text-white disabled:opacity-20 transition-colors"
        >
          출판
        </button>
      </div>

      <div className="px-6 py-6 flex flex-col gap-6 max-w-lg mx-auto">
        {/* AI 초안 생성 */}
        <div>
          {!showAiInput ? (
            <button
              onClick={() => setShowAiInput(true)}
              className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-sm hover:border-white/30 hover:text-white/60 transition-all"
            >
              ✦ AI로 1화 초안 생성
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                value={aiDirection}
                onChange={(e) => setAiDirection(e.target.value)}
                placeholder={`방향을 입력하세요 (선택)\n예: 주인공이 우주 기지에서 이상한 신호를 수신하는 장면으로 시작`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 placeholder-white/20 focus:outline-none focus:border-white/30 text-sm resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAiGenerate}
                  disabled={aiLoading}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-all disabled:opacity-50"
                >
                  {aiLoading ? "생성 중..." : "생성하기"}
                </button>
                <button
                  onClick={() => setShowAiInput(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white/30 text-sm hover:text-white/50"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 본문 */}
        <div>
          <label className="text-white/40 text-xs tracking-widest block mb-2">1화 본문</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="이야기를 시작하세요..."
            className="w-full bg-transparent border-none text-white/90 placeholder-white/20 focus:outline-none text-base leading-8 resize-none min-h-[300px]"
            rows={15}
          />
          <p className="text-white/20 text-xs mt-1">{content.length}자</p>
        </div>

        {/* 커버 이미지 — 본문 아래 배치 */}
        <div>
          <label className="text-white/40 text-xs tracking-widest block mb-3">
            커버 이미지 <span className="text-white/20">(선택)</span>
          </label>
          <ImageUploader
            onUpload={(url) => setCoverImageUrl(url)}
            currentImageUrl={coverImageUrl}
            storyTitle={title}
            genre={genreString}
            episodeTitle={`${title} 1화`}
            content={content}
          />
        </div>
      </div>
    </div>
  );
}
