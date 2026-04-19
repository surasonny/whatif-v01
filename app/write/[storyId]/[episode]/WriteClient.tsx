"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppState, Story, Episode } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { saveState } from "@/lib/store";
import ImageUploader from "@/app/components/ImageUploader";

export default function WriteClient() {
  const params = useParams();
  const router = useRouter();

  const storyId = params.storyId as string;
  const episodeParam = params.episode as string;
  const episodeIndex = parseInt(episodeParam) || 0;

  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);

    // 기존 내용 불러오기
    const story = state.stories.find((s) => s.id === storyId);
    if (story) {
      const mainUniverse = story.universes[0];
      const episode = mainUniverse.episodes[episodeIndex];
      if (episode) {
        setContent(episode.content);
        setCoverImageUrl((episode as any).coverImageUrl || "");
      }
    }
    setMounted(true);
  }, [storyId, episodeIndex]);

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

  const mainUniverse = story.universes[0];
  const episode: Episode | undefined = mainUniverse.episodes[episodeIndex];

  const handleSave = () => {
    if (!content.trim() || !appState) return;

    const updated: AppState = {
      ...appState,
      stories: appState.stories.map((s) => {
        if (s.id !== storyId) return s;
        return {
          ...s,
          universes: s.universes.map((u, ui) => {
            if (ui !== 0) return u;
            return {
              ...u,
              episodes: u.episodes.map((ep, ei) => {
                if (ei !== episodeIndex) return ep;
                return {
                  ...ep,
                  content: content.trim(),
                  coverImageUrl: coverImageUrl || undefined,
                } as any;
              }),
            };
          }),
        };
      }),
    };

    saveState(updated);
    setAppState(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
          <p className="text-white/80 text-sm font-medium">{story.title}</p>
          <p className="text-white/40 text-xs">
            {episode ? episode.title : `${episodeIndex + 1}화`}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!content.trim()}
          className="text-sm font-semibold text-white disabled:text-white/20"
        >
          {saved ? "저장됨 ✓" : "저장"}
        </button>
      </div>

      {/* 커버 이미지 업로드 */}
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-white/40 text-xs mb-3 tracking-wide">
          커버 이미지 (선택)
        </p>
        <ImageUploader
          onUpload={(url) => setCoverImageUrl(url)}
          currentImageUrl={coverImageUrl}
          storyTitle={story?.title}
          genre={story?.genre}
          episodeTitle={episode?.title}
          content={content}
        />
      </div>

      {/* 본문 작성 */}
      <div className="px-6 py-6">
        <p className="text-white/40 text-xs mb-3 tracking-wide">본문</p>
        <textarea
          className="w-full bg-transparent text-white/90 text-base leading-8 resize-none outline-none placeholder:text-white/20"
          rows={24}
          placeholder="이야기를 써주세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />
      </div>
    </div>
  );
}
