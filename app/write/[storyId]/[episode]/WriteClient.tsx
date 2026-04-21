"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppState, Episode } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { saveState } from "@/lib/store";

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
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    const story = state.stories.find((s) => s.id === storyId);
    if (story) {
      const mainUniverse = story.universes[0];
      const episode = mainUniverse?.episodes[episodeIndex];
      if (episode) {
        setContent(episode.content);
        setCoverImageUrl((episode as any).coverImageUrl || "");
      }
    }
    setMounted(true);
  }, [storyId, episodeIndex]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("5MB 이하 이미지만 업로드 가능합니다.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) setCoverImageUrl(data.url);
    } catch (e) {
      console.error("업로드 실패", e);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!appState) return;
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
                  content,
                  ...(coverImageUrl ? { coverImageUrl } : {}),
                };
              }),
            };
          }),
        };
      }),
    };
    setAppState(updated);
    saveState(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!mounted || !appState) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white/40 text-sm">불러오는 중...</p>
      </div>
    );
  }

  const story = appState.stories.find((s) => s.id === storyId);
  if (!story) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white/40 text-sm">작품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const episode: Episode = story.universes[0]?.episodes[episodeIndex];

  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          ← 취소
        </button>
        <div className="text-center">
          <p className="text-white/80 text-sm font-medium">{story.title}</p>
          <p className="text-white/30 text-xs">{episode?.title ?? `${episodeIndex + 1}화`}</p>
        </div>
        <button
          onClick={handleSave}
          className="text-sm font-medium text-white/60 hover:text-white transition-colors"
        >
          {saved ? "저장됨 ✓" : "저장"}
        </button>
      </div>

      <div className="px-6 py-6 flex flex-col gap-6 max-w-lg mx-auto">

        {/* 화 이미지 업로드 */}
        <div>
          <label className="text-white/40 text-xs tracking-widest block mb-3">
            이미지 <span className="text-white/20">(선택)</span>
          </label>

          {/* 이미지 미리보기 */}
          {coverImageUrl && (
            <div className="relative w-full h-48 mb-3 rounded-xl overflow-hidden">
              <img
                src={coverImageUrl}
                alt="화 이미지"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setCoverImageUrl("")}
                className="absolute top-2 right-2 bg-black/60 text-white/60 text-xs px-2 py-1 rounded-lg hover:text-white transition-colors"
              >
                제거
              </button>
            </div>
          )}

          {/* 업로드 버튼 */}
          {!coverImageUrl && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full h-14 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 hover:border-white/30 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-white/40 text-xs">업로드 중...</span>
                </>
              ) : (
                <>
                  <span>🖼️</span>
                  <span className="text-white/30 text-xs">이미지 업로드</span>
                </>
              )}
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* 본문 */}
        <div>
          <label className="text-white/40 text-xs tracking-widest block mb-2">본문</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="이야기를 이어가세요..."
            className="w-full bg-transparent border-none text-white/90 placeholder-white/20 focus:outline-none text-base leading-8 resize-none min-h-[400px]"
            rows={20}
          />
          <p className="text-white/20 text-xs mt-1">{content.length}자</p>
        </div>
      </div>
    </div>
  );
}
