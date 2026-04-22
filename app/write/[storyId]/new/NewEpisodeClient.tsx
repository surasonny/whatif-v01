"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppState, Episode } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { addEpisode } from "@/lib/store";

export default function NewEpisodeClient() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;

  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiDirection, setAiDirection] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setMounted(true);
  }, [storyId]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("5MB 이하 이미지만 업로드 가능합니다.");
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
    } catch {
      setError("업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!story) return;
    setAiLoading(true);
    try {
      const mainUniverse = story.universes.find((u) => u.isMain) ?? story.universes[0];
      const prevEpisodes = mainUniverse.episodes.map((ep) => ep.content).join("\n\n---\n\n");
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: story.title,
          previousEpisodes: prevEpisodes,
          currentEpisode: "",
          direction: aiDirection || `${story.genre} 장르. 이전 화에서 자연스럽게 이어지는 다음 화.`,
        }),
      });
      const data = await res.json();
      if (data.content) setContent(data.content);
    } catch {
      setError("AI 생성 실패");
    } finally {
      setAiLoading(false);
      setShowAiInput(false);
    }
  };

  const handlePublish = () => {
    if (!appState || !story || !content.trim()) return;

    const mainUniverse = story.universes.find((u) => u.isMain) ?? story.universes[0];
    const nextIndex = mainUniverse.episodes.length;
    const remixAllowed = nextIndex >= 3;

    const newEpisode: Episode = {
      index: nextIndex,
      title: `${nextIndex + 1}화`,
      remixAllowed,
      likes: 0,
      dislikes: 0,
      content: content.trim(),
      ...(coverImageUrl ? { coverImageUrl } : {}),
    } as Episode;

    const result = addEpisode(storyId, mainUniverse.id, newEpisode);
    if (!result.ok) {
      setError(result.reason ?? "저장 실패");
      return;
    }
    router.push(`/reader/${storyId}/${nextIndex}`);
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

  const mainUniverse = story.universes.find((u) => u.isMain) ?? story.universes[0];
  const nextEpisodeNumber = mainUniverse.episodes.length + 1;

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
          <p className="text-white/30 text-xs">{nextEpisodeNumber}화 새로 쓰기</p>
        </div>
        <button
          onClick={handlePublish}
          disabled={!content.trim()}
          className="text-sm font-medium text-white/60 hover:text-white disabled:opacity-20 transition-colors"
        >
          출판
        </button>
      </div>

      <div className="px-6 py-6 flex flex-col gap-6 max-w-lg mx-auto">
        {/* 에러 */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* AI 초안 생성 */}
        <div>
          {!showAiInput ? (
            <button
              onClick={() => setShowAiInput(true)}
              className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-sm hover:border-white/30 hover:text-white/60 transition-all"
            >
              ✦ AI로 {nextEpisodeNumber}화 초안 생성
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                value={aiDirection}
                onChange={(e) => setAiDirection(e.target.value)}
                placeholder={`방향을 입력하세요 (선택)\n예: 하은이 민준과 함께 오태석에 맞서는 장면`}
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
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white/30 text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 본문 */}
        <div>
          <label className="text-white/40 text-xs tracking-widest block mb-2">
            {nextEpisodeNumber}화 본문
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="이야기를 이어가세요..."
            className="w-full bg-transparent border-none text-white/90 placeholder-white/20 focus:outline-none text-base leading-8 resize-none min-h-[400px]"
            rows={20}
          />
          <p className="text-white/20 text-xs mt-1">{content.length}자</p>
        </div>

        {/* 이미지 업로드 */}
        <div>
          <label className="text-white/40 text-xs tracking-widest block mb-3">
            이미지 <span className="text-white/20">(선택)</span>
          </label>
          {coverImageUrl && (
            <div className="relative w-full h-48 mb-3 rounded-xl overflow-hidden">
              <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setCoverImageUrl("")}
                className="absolute top-2 right-2 bg-black/60 text-white/60 text-xs px-2 py-1 rounded-lg"
              >
                제거
              </button>
            </div>
          )}
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
      </div>
    </div>
  );
}
