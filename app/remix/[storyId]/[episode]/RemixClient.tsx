"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppState, Story, Universe, Episode } from "@/lib/types";
import { saveState } from "@/lib/store";
import { seedIfEmpty } from "@/lib/seed";
import ImageUploader from "@/app/components/ImageUploader";

export default function RemixClient() {
  const params = useParams();
  const router = useRouter();

  const storyId = params.storyId as string;
  const episodeParam = params.episode as string;
  const episodeIndex = parseInt(episodeParam) || 0;

  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"input" | "generating" | "edit" | "done">("input");

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setMounted(true);
  }, []);
  const [direction, setDirection] = useState("");
  const [remixText, setRemixText] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [error, setError] = useState("");

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

  const mainUniverse: Universe = story.universes[0];
  const episode: Episode | undefined = mainUniverse.episodes[episodeIndex];

  if (!episode || !episode.remixAllowed) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-black px-8">
        <p className="text-white/60 text-sm mb-4">이 화는 아직 리믹스가 열리지 않았습니다.</p>
        <p className="text-white/30 text-xs mb-8">최소 4화부터 리믹스가 가능합니다.</p>
        <button
          onClick={() => router.push(`/reader/${storyId}/${episodeIndex}`)}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          ← 읽기로 돌아가기
        </button>
      </div>
    );
  }

  const previousEpisodes = mainUniverse.episodes
    .slice(0, episodeIndex)
    .map((ep) => `[${ep.title}]\n${ep.content}`)
    .join("\n\n");

  const handleGenerate = async () => {
    if (!direction.trim()) return;
    setStep("generating");
    setError("");

    try {
      const response = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: story.title,
          previousEpisodes,
          currentEpisode: episode.content,
          direction,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!data.text) throw new Error("생성된 내용이 없습니다");

      setRemixText(data.text);
      setStep("edit");
    } catch (e: any) {
      setError(e.message || "오류가 발생했습니다. 다시 시도해주세요.");
      setStep("input");
    }
  };

  const handleSubmit = () => {
    if (!remixText.trim() || !appState) return;

    const existingCount = story.universes.length;
    const newId = `u${existingCount + 1}`;
    const newLabel = `리믹스 #${existingCount}`;

    const inheritedEpisodes: Episode[] = mainUniverse.episodes
      .slice(0, episodeIndex)
      .map((ep) => ({ ...ep }));

    const remixEpisode: Episode = {
      index: episodeIndex,
      title: `${episodeIndex + 1}화 — 리믹스`,
      content: remixText.trim(),
      likes: 0,
      dislikes: 0,
      remixAllowed: true,
      coverImageUrl: coverImageUrl || undefined,
    } as any;

    const newUniverse: Universe = {
      id: newId,
      label: newLabel,
      isMain: false,
      branchFromEpisode: episodeIndex,
      episodes: [...inheritedEpisodes, remixEpisode],
    };

    const updated: AppState = {
      ...appState,
      stories: appState.stories.map((s) => {
        if (s.id !== storyId) return s;
        return {
          ...s,
          universes: [...s.universes, newUniverse],
        };
      }),
    };

    saveState(updated);
    setAppState(updated);
    import("@/lib/supabaseStore").then(({ saveStoryToSupabase }) => {
      const updatedStory = updated.stories.find((s: any) => s.id === storyId);
      if (updatedStory) saveStoryToSupabase(updatedStory);
    });
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-black px-8">
        <p className="text-white text-lg font-semibold mb-3">새 유니버스가 생성되었습니다.</p>
        <p className="text-white/40 text-sm mb-10">
          Reader에서 유니버스 버튼으로 확인할 수 있습니다.
        </p>
        <button
          onClick={() => router.push(`/reader/${storyId}/${episodeIndex}`)}
          className="px-6 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-95 transition-all"
        >
          Reader에서 확인하기
        </button>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-black px-8 gap-6">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/60 text-sm">AI가 새로운 이야기를 쓰고 있습니다...</p>
        <p className="text-white/30 text-xs">"{direction}"</p>
      </div>
    );
  }

  if (step === "edit") {
    return (
      <div className="w-full min-h-screen bg-black text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <button
            onClick={() => setStep("input")}
            className="text-white/50 text-sm hover:text-white transition-colors"
          >
            ← 다시 생성
          </button>
          <p className="text-white/80 text-sm font-medium">AI 초안 검토</p>
          <button
            onClick={handleSubmit}
            disabled={!remixText.trim()}
            className="text-sm font-semibold text-white disabled:text-white/20"
          >
            등록
          </button>
        </div>

        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-white/30 text-xs">방향: "{direction}"</p>
        </div>

        {/* 커버 이미지 업로드 */}
        <div className="px-6 py-5 border-b border-white/10">
          <p className="text-white/40 text-xs mb-3 tracking-wide">
            커버 이미지 (선택)
          </p>
          <ImageUploader
            onUpload={(url) => setCoverImageUrl(url)}
            currentImageUrl={coverImageUrl}
          />
        </div>

        <div className="px-6 py-6">
          <p className="text-white/40 text-xs mb-3 tracking-wide">
            내용을 자유롭게 수정한 뒤 등록하세요.
          </p>
          <textarea
            className="w-full bg-transparent text-white/90 text-base leading-8 resize-none outline-none"
            rows={20}
            value={remixText}
            onChange={(e) => setRemixText(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button
          onClick={() => router.push(`/reader/${storyId}/${episodeIndex}`)}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          ← 취소
        </button>
        <p className="text-white/80 text-sm font-medium">리믹스</p>
        <div className="w-8" />
      </div>

      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-white/30 text-xs mb-1">
          {story.title} — {episode.title}
        </p>
        <p className="text-white/50 text-sm leading-relaxed line-clamp-3">
          {episode.content.slice(0, 120)}...
        </p>
      </div>

      <div className="px-6 py-8">
        <p className="text-white text-base font-medium mb-2">
          이 화에서 이야기가 어떻게 달라지면 좋겠어?
        </p>
        <p className="text-white/30 text-xs mb-6">
          짧게 방향만 써줘도 돼. AI가 웹소설로 써줄게.
        </p>

        <textarea
          className="w-full bg-white/5 rounded-xl text-white/90 text-base leading-7 p-4 outline-none resize-none placeholder:text-white/20 focus:bg-white/8 transition-colors"
          rows={4}
          placeholder={`예: 하은이 신호를 무시하고 혼자 화성으로 떠난다\n예: 민준이 사실 신호의 발신자였다는 게 밝혀진다`}
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          autoFocus
        />

        {error && (
          <p className="text-red-400/70 text-xs mt-3">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={!direction.trim()}
          className="w-full mt-6 py-4 rounded-2xl bg-white text-black font-semibold text-base disabled:opacity-30 hover:bg-white/90 active:scale-95 transition-all"
        >
          ✦ AI로 초안 생성
        </button>
      </div>
    </div>
  );
}