"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppState, Story, Universe, Episode } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { saveState } from "@/lib/store";
import { useMyNickname } from "@/app/components/AuthorModeToggle";
import ImageUploader from "@/app/components/ImageUploader";

const GENRES = ["SF", "판타지", "로맨스", "일상", "스릴러", "미스터리"];

export default function NewStoryPage() {
  const router = useRouter();
  const { nickname } = useMyNickname();

  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"info" | "write">("info");

  // 작품 기본 정보
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("SF");
  const [hook, setHook] = useState("");
  const [authorName, setAuthorName] = useState("");

  // 1화 내용
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [aiDirection, setAiDirection] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setMounted(true);
    if (nickname) setAuthorName(nickname);
  }, [nickname]);

  if (!mounted || !appState) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white text-sm opacity-50">불러오는 중...</p>
      </div>
    );
  }

  const handleAiGenerate = async () => {
    if (!aiDirection.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: title,
          previousEpisodes: hook ? `작품 소개: ${hook}` : "",
          currentEpisode: hook ? `이 작품의 핵심 한 줄: "${hook}"` : "",
          direction: aiDirection,
        }),
      });
      const data = await response.json();
      if (data.text) {
        setContent(data.text);
        setShowAiInput(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = () => {
    if (!title.trim() || !content.trim() || !appState) return;

    const newStoryId = `story-${Date.now()}`;
    const author = authorName.trim() || nickname || "익명";

    const firstEpisode: Episode = {
      index: 0,
      title: "1화",
      content: content.trim(),
      likes: 0,
      dislikes: 0,
      remixAllowed: false,
      coverImageUrl: coverImageUrl || undefined,
    } as any;

    const mainUniverse: Universe = {
      id: "u1",
      label: "원작",
      isMain: true,
      branchFromEpisode: null,
      episodes: [firstEpisode],
    };

    const newStory: Story = {
      id: newStoryId,
      title: title.trim(),
      genre,
      author,
      hook: hook.trim() || title.trim(),
      coverColor: "#0f172a",
      universes: [mainUniverse],
      seedVersion: 1,
    };

    const updated: AppState = {
      ...appState,
      stories: [newStory, ...appState.stories],
    };

    saveState(updated);
    router.push(`/reader/${newStoryId}/0`);
  };

  // 작품 정보 입력 화면
  if (step === "info") {
    return (
      <div className="w-full min-h-screen bg-black text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <button
            onClick={() => router.push("/")}
            className="text-white/50 text-sm hover:text-white transition-colors"
          >
            ← 취소
          </button>
          <p className="text-white/80 text-sm font-medium">새 작품</p>
          <button
            onClick={() => {
              if (title.trim()) setStep("write");
            }}
            disabled={!title.trim()}
            className="text-sm font-semibold text-white disabled:text-white/20"
          >
            다음 →
          </button>
        </div>

        <div className="px-6 py-8 flex flex-col gap-6">
          {/* 제목 */}
          <div>
            <p className="text-white/40 text-xs mb-2 tracking-wide">작품 제목</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full bg-white/5 rounded-xl text-white/90 text-base p-4 outline-none placeholder:text-white/20 border border-white/10 focus:border-white/30 transition-colors"
              autoFocus
            />
          </div>

          {/* 작가명 */}
          <div>
            <p className="text-white/40 text-xs mb-2 tracking-wide">작가명</p>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="작가명 (닉네임 자동 입력)"
              className="w-full bg-white/5 rounded-xl text-white/90 text-base p-4 outline-none placeholder:text-white/20 border border-white/10 focus:border-white/30 transition-colors"
            />
          </div>

          {/* 장르 */}
          <div>
            <p className="text-white/40 text-xs mb-2 tracking-wide">장르</p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    genre === g
                      ? "bg-white text-black"
                      : "border border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 훅 문장 */}
          <div>
            <p className="text-white/40 text-xs mb-2 tracking-wide">
              한 줄 소개 <span className="text-white/20">(홈 카드에 표시)</span>
            </p>
            <input
              type="text"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="독자를 끌어당기는 한 문장"
              className="w-full bg-white/5 rounded-xl text-white/90 text-base p-4 outline-none placeholder:text-white/20 border border-white/10 focus:border-white/30 transition-colors"
            />
          </div>
        </div>
      </div>
    );
  }

  // 1화 작성 화면
  return (
    <div className="w-full min-h-screen bg-black text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button
          onClick={() => setStep("info")}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          ← 뒤로
        </button>
        <div className="text-center">
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-white/40 text-xs">1화 작성</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={!content.trim()}
          className="text-sm font-semibold text-white disabled:text-white/20"
        >
          출판
        </button>
      </div>

      {/* 커버 이미지 */}
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-white/40 text-xs mb-3 tracking-wide">커버 이미지 (선택)</p>
        <ImageUploader
          onUpload={(url) => setCoverImageUrl(url)}
          currentImageUrl={coverImageUrl}
          storyTitle={title}
          genre={genre}
          episodeTitle={`${title} 1화`}
          content={content}
        />
      </div>

      {/* AI 초안 생성 */}
      <div className="px-6 py-4 border-b border-white/10">
        {!showAiInput ? (
          <button
            onClick={() => setShowAiInput(true)}
            className="w-full py-3 rounded-xl border border-white/20 text-white/50 text-sm font-medium hover:border-white/40 hover:text-white/80 transition-all"
          >
            ✦ AI로 1화 초안 생성
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-white/40 text-xs tracking-wide">
              어떤 이야기를 쓰고 싶어? 방향만 알려줘.
            </p>
            <textarea
              className="w-full bg-white/5 rounded-xl text-white/90 text-sm leading-7 p-4 outline-none resize-none placeholder:text-white/20 border border-white/10 focus:border-white/30 transition-colors"
              rows={3}
              placeholder="예: 2047년 우주 통신 기지에서 일하는 여성이 미스터리한 신호를 받는다"
              value={aiDirection}
              onChange={(e) => setAiDirection(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAiInput(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/30 text-sm hover:text-white/60 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={!aiDirection.trim() || aiLoading}
                className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-30 hover:bg-white/90 active:scale-95 transition-all"
              >
                {aiLoading ? "생성 중..." : "생성"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="px-6 py-6">
        <p className="text-white/40 text-xs mb-3 tracking-wide">1화 본문</p>
        <textarea
          className="w-full bg-transparent text-white/90 text-base leading-8 resize-none outline-none placeholder:text-white/20"
          rows={24}
          placeholder="이야기를 시작하세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />
      </div>
    </div>
  );
}
