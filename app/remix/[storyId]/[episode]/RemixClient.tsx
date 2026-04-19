"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppState, Story, Universe, Episode } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { saveState } from "@/lib/store";

export default function RemixClient() {
  const params = useParams();
  const router = useRouter();

  const storyId = params.storyId as string;
  const episodeParam = params.episode as string;
  const episodeIndex = parseInt(episodeParam) || 0;

  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [remixText, setRemixText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [newUniverseId, setNewUniverseId] = useState<string>("");

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setMounted(true);
  }, []);

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

  // 리믹스 가능 여부 체크
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

  if (submitted) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-black px-8">
        <p className="text-white text-lg font-semibold mb-3">새 유니버스가 생성되었습니다.</p>
        <p className="text-white/40 text-sm mb-10">
          Reader에서 위/아래 스와이프로 확인할 수 있습니다.
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

  const handleSubmit = () => {
    if (!remixText.trim() || !appState) return;

    // 현재 유니버스 개수로 새 ID 생성
    const existingCount = story.universes.length;
    const newId = `u${existingCount + 1}`;
    const newLabel = `리믹스 #${existingCount}`;

    // 원작에서 분기 지점까지의 에피소드 복사
    const inheritedEpisodes: Episode[] = mainUniverse.episodes
      .slice(0, episodeIndex)
      .map((ep) => ({ ...ep }));

    // 리믹스 에피소드 추가
    const remixEpisode: Episode = {
      index: episodeIndex,
      title: `${episodeIndex + 1}화 — 리믹스`,
      content: remixText.trim(),
      likes: 0,
      dislikes: 0,
      remixAllowed: true,
    };

    const newUniverse: Universe = {
      id: newId,
      label: newLabel,
      isMain: false,
      branchFromEpisode: episodeIndex,
      episodes: [...inheritedEpisodes, remixEpisode],
    };

    // appState 업데이트
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
    setNewUniverseId(newId);
    setSubmitted(true);
  };

  const totalUniverses = story.universes.length;

  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button
          onClick={() => router.push(`/reader/${storyId}/${episodeIndex}`)}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          ← 취소
        </button>
        <div className="text-center">
          <p className="text-white/80 text-sm font-medium">리믹스 작성</p>
          <p className="text-white/30 text-xs">{episode.title}</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!remixText.trim()}
          className="text-sm font-semibold text-white disabled:text-white/20 hover:text-white/70 transition-colors"
        >
          등록
        </button>
      </div>

      {/* 원본 에피소드 요약 */}
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-white/30 text-xs mb-1">
          {story.title} — {episode.title}
        </p>
        <p className="text-white/50 text-sm leading-relaxed line-clamp-3">
          {episode.content.slice(0, 120)}...
        </p>
        <p className="text-white/20 text-xs mt-3">
          현재 유니버스 {totalUniverses}개 · 새 유니버스 u{totalUniverses + 1} 생성 예정
        </p>
      </div>

      {/* 리믹스 입력 */}
      <div className="px-6 py-6">
        <p className="text-white/40 text-xs mb-3 tracking-wide">
          이 화에서 이야기가 달라진다면?
        </p>
        <textarea
          className="w-full bg-transparent text-white/90 text-base leading-8 resize-none outline-none placeholder:text-white/20"
          rows={20}
          placeholder="여기서부터 새로운 유니버스가 시작됩니다..."
          value={remixText}
          onChange={(e) => setRemixText(e.target.value)}
          autoFocus
        />
      </div>
    </div>
  );
}
