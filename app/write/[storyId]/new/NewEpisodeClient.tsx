"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppState, Episode } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";
import { addEpisode } from "@/lib/store";

const STYLE_PRESETS = [
  { label: "빠른 전개", desc: "긴장감 있고 속도감 있는 문체" },
  { label: "감성적", desc: "섬세한 감정 묘사, 여운 있는 문장" },
  { label: "하드보일드", desc: "건조하고 냉정한 시점, 간결한 문장" },
  { label: "유머러스", desc: "코믹한 상황, 가벼운 톤" },
  { label: "서정적", desc: "시적인 표현, 풍경 묘사 중심" },
  { label: "스릴러풍", desc: "긴장감 극대화, 반전 중심" },
];

export default function NewEpisodeClient() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;

  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // AI 도구
  const [aiMode, setAiMode] = useState<"generate" | "continue" | "edit" | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDirection, setAiDirection] = useState("");
  const [editStyle, setEditStyle] = useState("");

  // 스토리 가이드 (접기/펼치기)
  const [showGuide, setShowGuide] = useState(false);
  const [characters, setCharacters] = useState<{ name: string; role: string; desc: string }[]>(
    [{ name: "", role: "주인공", desc: "" }]
  );
  const [setting, setSetting] = useState("");
  const [conflict, setConflict] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [customStyle, setCustomStyle] = useState("");

  useEffect(() => {
    const state = seedIfEmpty();
    setAppState(state);
    setMounted(true);
  }, [storyId]);

  function addCharacter() {
    if (characters.length >= 5) return;
    setCharacters((prev) => [...prev, { name: "", role: "조연", desc: "" }]);
  }

  function removeCharacter(index: number) {
    setCharacters((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCharacter(index: number, field: "name" | "role" | "desc", value: string) {
    setCharacters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

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
      const res = await fetch("/api/upload", { method: "POST", body: formData });
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

    const styleText = customStyle.trim() || writingStyle;
    const characterText = characters
      .filter((c) => c.name.trim())
      .map((c) => `${c.role} ${c.name}${c.desc ? ` (${c.desc})` : ""}`)
      .join(", ");
    const guideLines = [
      characterText && `등장인물: ${characterText}`,
      setting && `배경: ${setting}`,
      conflict && `핵심 갈등: ${conflict}`,
      styleText && `작가 스타일: ${styleText}`,
    ].filter(Boolean);
    const guideContext = guideLines.join("\n");

    const mainUniverse = story.universes.find((u) => u.isMain) ?? story.universes[0];
    const prevContent = mainUniverse.episodes
      .slice(-2)
      .map((ep) => ep.content)
      .join("\n\n---\n\n");

    let finalDirection = "";
    let prevEpisodes = "";
    let currentEp = "";

    if (aiMode === "generate") {
      finalDirection = guideContext
        ? `${guideContext}${aiDirection.trim() ? `\n\n추가 방향: ${aiDirection.trim()}` : ""}`
        : aiDirection.trim() || `${story.genre} 장르. 이전 화에서 자연스럽게 이어지는 다음 화.`;
      prevEpisodes = prevContent;
      currentEp = "";
    } else if (aiMode === "continue") {
      prevEpisodes = content.trim();
      currentEp = "위 내용에 이어서 작성";
      finalDirection = `이전 내용의 문체와 스타일을 반드시 유지하면서 자연스럽게 이어써줘.${aiDirection.trim() ? `\n추가 방향: ${aiDirection.trim()}` : ""}`;
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
      if (data.content) setContent((prev) =>
        aiMode === "continue" ? prev + "\n\n" + data.content : data.content
      );
    } catch {
      setError("AI 생성 실패");
    } finally {
      setAiLoading(false);
      setAiMode(null);
      setAiDirection("");
      setEditStyle("");
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
    <div className="w-full bg-black text-white flex flex-col" style={{ height: "100dvh" }}>
      {/* 상단 바 */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white/50 text-sm hover:text-white transition-colors">
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

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-28">
        <div className="flex flex-col gap-6 max-w-lg mx-auto">

          {/* 에러 */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* 스토리 가이드 토글 */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full py-2.5 rounded-xl border border-white/10 text-white/30 text-xs hover:border-white/20 hover:text-white/50 transition-all text-left px-4 flex items-center justify-between"
          >
            <span>📋 스토리 가이드 {showGuide ? "접기" : "펼치기"}</span>
            <span>{showGuide ? "▲" : "▼"}</span>
          </button>

          {/* 스토리 가이드 내용 */}
          {showGuide && (
            <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/3 border border-white/10">
              {/* 등장인물 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-white/40 text-xs tracking-widest flex-shrink-0">등장인물</label>
                  <button
                    onClick={addCharacter}
                    disabled={characters.length >= 5}
                    className="text-white/30 text-xs px-2 py-1 rounded border border-white/10 hover:border-white/30 flex-shrink-0 disabled:opacity-20"
                  >
                    + 추가
                  </button>
                </div>
                <div className="flex flex-col gap-2 w-full overflow-hidden">
                  {characters.map((char, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <select
                          value={char.role}
                          onChange={(e) => updateCharacter(i, "role", e.target.value)}
                          className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-white/60 text-xs focus:outline-none flex-shrink-0"
                        >
                          <option value="주인공">주인공</option>
                          <option value="조연">조연</option>
                          <option value="악역">악역</option>
                          <option value="조력자">조력자</option>
                          <option value="기타">기타</option>
                        </select>
                        <input
                          value={char.name}
                          onChange={(e) => updateCharacter(i, "name", e.target.value)}
                          placeholder="이름"
                          className="w-20 min-w-0 bg-transparent border-b border-white/10 text-white/70 text-sm py-1 focus:outline-none focus:border-white/30 placeholder-white/20"
                        />
                        {i > 0 && (
                          <button onClick={() => removeCharacter(i)} className="text-white/20 hover:text-red-400/60 text-xs flex-shrink-0">✕</button>
                        )}
                      </div>
                      <input
                        value={char.desc}
                        onChange={(e) => updateCharacter(i, "desc", e.target.value)}
                        placeholder="특징"
                        className="w-full bg-transparent border-b border-white/10 text-white/50 text-xs py-1 focus:outline-none placeholder-white/20"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 배경 */}
              <div>
                <label className="text-white/40 text-xs tracking-widest block mb-1">세계관 / 배경</label>
                <p className="text-white/20 text-xs mb-2">전체 작품의 배경과 세계관을 적어주세요</p>
                <input value={setting} onChange={(e) => setSetting(e.target.value)} placeholder="예: 2047년 화성 탐사 이후 지구 대기권 밖 통신 기지"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-sm" />
              </div>

              {/* 이번 화에서 일어날 일 */}
              <div>
                <label className="text-white/40 text-xs tracking-widest block mb-1">이번 화에서 일어날 일</label>
                <p className="text-white/20 text-xs mb-2">이 화에서 반드시 일어나야 할 사건이나 장면을 적어주세요. 구체적일수록 AI가 잘 따라요</p>
                <textarea value={conflict} onChange={(e) => setConflict(e.target.value)} placeholder="예: 하은이 수상한 신호를 수신하고, 상관에게 보고할지 숨길지 고민한다"
                  rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-sm resize-none" />
              </div>

              {/* 작가 스타일 */}
              <div>
                <label className="text-white/40 text-xs tracking-widest block mb-2">작가 스타일</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {STYLE_PRESETS.map((s) => (
                    <button key={s.label}
                      onClick={() => setWritingStyle(writingStyle === s.label ? "" : s.label)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                        writingStyle === s.label
                          ? "bg-white/15 border-white/40 text-white/90"
                          : "border-white/10 text-white/40 hover:border-white/30"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <input value={customStyle} onChange={(e) => setCustomStyle(e.target.value)}
                  placeholder="직접 입력 (예: 무라카미 하루키 스타일)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-sm" />
              </div>
            </div>
          )}

          {/* AI 도구 */}
          <div className="flex flex-col gap-2">
            {aiMode === null && (
              <div className="flex gap-2">
                {!content.trim() && (
                  <button onClick={() => setAiMode("generate")}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-xs hover:border-white/30 hover:text-white/60 transition-all">
                    ✦ 초안 생성
                  </button>
                )}
                {content.trim() && (
                  <button onClick={() => setAiMode("continue")}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-xs hover:border-white/30 hover:text-white/60 transition-all">
                    ✦ 이어쓰기
                  </button>
                )}
                {content.trim() && (
                  <button onClick={() => setAiMode("edit")}
                    className="flex-1 py-2.5 rounded-xl border border-amber-400/20 text-amber-400/40 text-xs hover:border-amber-400/40 hover:text-amber-400/70 transition-all">
                    ✦ AI 편집
                  </button>
                )}
              </div>
            )}

            {(aiMode === "generate" || aiMode === "continue") && (
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs">
                  {aiMode === "generate" ? "✦ AI 초안 생성" : "✦ AI 이어쓰기"}
                </p>
                <textarea value={aiDirection} onChange={(e) => setAiDirection(e.target.value)}
                  placeholder={aiMode === "generate" ? "추가 방향 (선택)" : "이어쓸 방향 (선택)"}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 placeholder-white/20 focus:outline-none focus:border-white/30 text-sm resize-none"
                  rows={2} />
                <div className="flex gap-2">
                  <button onClick={handleAiGenerate} disabled={aiLoading}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-all disabled:opacity-50">
                    {aiLoading ? "생성 중..." : aiMode === "generate" ? "생성하기" : "이어쓰기"}
                  </button>
                  <button onClick={() => { setAiMode(null); setAiDirection(""); }}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-white/30 text-sm">
                    취소
                  </button>
                </div>
              </div>
            )}

            {aiMode === "edit" && (
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-amber-400/5 border border-amber-400/10">
                <p className="text-amber-400/50 text-xs">✦ AI 편집 — 스토리는 바뀌지 않아요</p>
                <div className="flex flex-wrap gap-2">
                  {["풍성하게", "간결하게", "긴장감 있게", "감성적으로"].map((s) => (
                    <button key={s} onClick={() => setEditStyle(editStyle === s ? "" : s)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        editStyle === s
                          ? "bg-amber-400/20 border-amber-400/50 text-amber-400"
                          : "border-amber-400/20 text-amber-400/40 hover:border-amber-400/40"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAiGenerate} disabled={aiLoading || !editStyle}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400/10 text-amber-400/70 text-sm hover:bg-amber-400/20 transition-all disabled:opacity-30">
                    {aiLoading ? "편집 중..." : "편집하기"}
                  </button>
                  <button onClick={() => { setAiMode(null); setEditStyle(""); }}
                    className="px-4 py-2.5 rounded-xl border border-amber-400/10 text-amber-400/30 text-sm">
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
                <button onClick={() => setCoverImageUrl("")}
                  className="absolute top-2 right-2 bg-black/60 text-white/60 text-xs px-2 py-1 rounded-lg">
                  제거
                </button>
              </div>
            )}
            {!coverImageUrl && (
              <button onClick={() => inputRef.current?.click()} disabled={uploading}
                className="w-full h-14 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 hover:border-white/30 transition-colors disabled:opacity-50">
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span className="text-white/40 text-xs">업로드 중...</span></>
                ) : (
                  <><span>🖼️</span><span className="text-white/30 text-xs">이미지 업로드</span></>
                )}
              </button>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = ""; }} />
          </div>
        </div>
      </div>

      {/* 하단 출판 버튼 */}
      <div className="flex-shrink-0 bg-black border-t border-white/10 py-4 px-6">
        <button
          onClick={handlePublish}
          disabled={!content.trim()}
          className="w-full py-4 rounded-2xl bg-white text-black font-bold text-base disabled:opacity-20 hover:bg-white/90 active:scale-95 transition-all"
        >
          {content.trim() ? "출판하기" : "본문을 작성해주세요"}
        </button>
      </div>
    </div>
  );
}
