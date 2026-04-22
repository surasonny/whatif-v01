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

  // AI 도구
  const [aiMode, setAiMode] = useState<"continue" | "edit" | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDirection, setAiDirection] = useState("");
  const [editStyle, setEditStyle] = useState("");

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
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setCoverImageUrl(data.url);
    } catch (e) {
      console.error("업로드 실패", e);
    } finally {
      setUploading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!appState || !content.trim()) return;
    const story = appState.stories.find((s) => s.id === storyId);
    if (!story) return;

    setAiLoading(true);

    let finalDirection = "";
    let prevEpisodes = "";
    let currentEp = "";

    if (aiMode === "continue") {
      prevEpisodes = content.trim();
      currentEp = "위 내용에 이어서 작성";
      finalDirection = `이전 내용의 문체와 스타일을 반드시 유지하면서 자연스럽게 이어써줘.${
        aiDirection.trim() ? `\n추가 방향: ${aiDirection.trim()}` : ""
      }`;
    } else if (aiMode === "edit") {
      prevEpisodes = "";
      currentEp = content.trim();
      const editMap: Record<string, string> = {
        "풍성하게": "스토리와 등장인물을 절대 바꾸지 말고, 묘사와 감정 표현을 더 풍성하고 생생하게 다듬어줘.",
        "간결하게": "스토리와 등장인물을 절대 바꾸지 말고, 불필요한 부분을 제거해서 더 간결하고 임팩트 있게 다듬어줘.",
        "긴장감 있게": "스토리와 등장인물을 절대 바꾸지 말고, 긴장감과 속도감을 높여줘. 문장을 더 짧고 강렬하게.",
        "감성적으로": "스토리와 등장인물을 절대 바꾸지 말고, 감정 묘사를 더 섬세하고 감성적으로 다듬어줘.",
      };
      finalDirection = editMap[editStyle] || "스토리와 등장인물을 절대 바꾸지 말고, 문체만 더 자연스럽고 읽기 좋게 다듬어줘.";
    }

    try {
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: story.title,
          previousEpisodes: prevEpisodes,
          currentEpisode: currentEp,
          direction: finalDirection,
        }),
      });
      const data = await res.json();
      if (data.content) {
        if (aiMode === "continue") {
          setContent((prev) => prev + "\n\n" + data.content);
        } else {
          setContent(data.content);
        }
      }
    } catch (e) {
      console.error("AI 생성 실패", e);
    } finally {
      setAiLoading(false);
      setAiMode(null);
      setAiDirection("");
      setEditStyle("");
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
    <div className="w-full bg-black text-white flex flex-col" style={{ height: "100dvh" }}>
      {/* 상단 바 */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/10">
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

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-6">
        <div className="flex flex-col gap-6 max-w-lg mx-auto">

          {/* 이미지 업로드 */}
          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-3">
              이미지 <span className="text-white/20">(선택)</span>
            </label>
            {coverImageUrl && (
              <div className="relative w-full h-48 mb-3 rounded-xl overflow-hidden">
                <img src={coverImageUrl} alt="화 이미지" className="w-full h-full object-cover" />
                <button
                  onClick={() => setCoverImageUrl("")}
                  className="absolute top-2 right-2 bg-black/60 text-white/60 text-xs px-2 py-1 rounded-lg hover:text-white transition-colors"
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

          {/* AI 도구 */}
          <div className="flex flex-col gap-2">
            {aiMode === null && (
              <div className="flex gap-2">
                <button
                  onClick={() => setAiMode("continue")}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-xs hover:border-white/30 hover:text-white/60 transition-all"
                >
                  ✦ 이어쓰기
                </button>
                <button
                  onClick={() => setAiMode("edit")}
                  className="flex-1 py-2.5 rounded-xl border border-amber-400/20 text-amber-400/40 text-xs hover:border-amber-400/40 hover:text-amber-400/70 transition-all"
                >
                  ✦ AI 편집
                </button>
              </div>
            )}

            {/* 이어쓰기 패널 */}
            {aiMode === "continue" && (
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs">✦ AI 이어쓰기</p>
                <textarea
                  value={aiDirection}
                  onChange={(e) => setAiDirection(e.target.value)}
                  placeholder="이어쓸 방향 입력 (선택) — 이전 문체가 유지됩니다"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 placeholder-white/20 focus:outline-none focus:border-white/30 text-sm resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !content.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-all disabled:opacity-50"
                  >
                    {aiLoading ? "생성 중..." : "이어쓰기"}
                  </button>
                  <button
                    onClick={() => { setAiMode(null); setAiDirection(""); }}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-white/30 text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 편집 패널 */}
            {aiMode === "edit" && (
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-amber-400/5 border border-amber-400/10">
                <p className="text-amber-400/50 text-xs">✦ AI 편집 — 스토리는 바뀌지 않아요</p>
                <div className="flex flex-wrap gap-2">
                  {["풍성하게", "간결하게", "긴장감 있게", "감성적으로"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditStyle(editStyle === s ? "" : s)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        editStyle === s
                          ? "bg-amber-400/20 border-amber-400/50 text-amber-400"
                          : "border-amber-400/20 text-amber-400/40 hover:border-amber-400/40 hover:text-amber-400/70"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !editStyle || !content.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400/10 text-amber-400/70 text-sm hover:bg-amber-400/20 transition-all disabled:opacity-30"
                  >
                    {aiLoading ? "편집 중..." : "편집하기"}
                  </button>
                  <button
                    onClick={() => { setAiMode(null); setEditStyle(""); }}
                    className="px-4 py-2.5 rounded-xl border border-amber-400/10 text-amber-400/30 text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
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

      {/* 하단 저장 버튼 */}
      <div className="flex-shrink-0 bg-black border-t border-white/10 py-4 px-6">
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl bg-white text-black font-bold text-base hover:bg-white/90 active:scale-95 transition-all"
        >
          {saved ? "저장됨 ✓" : "저장하기"}
        </button>
      </div>
    </div>
  );
}
