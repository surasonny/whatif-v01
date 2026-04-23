"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppState, Story, Universe, Episode } from "@/lib/types";
import { saveState } from "@/lib/store";
import { useMyNickname } from "@/app/components/AuthorModeToggle";
import ImageUploader from "@/app/components/ImageUploader";

const GENERAL_GENRES = [
  "SF", "판타지", "로맨스", "일상", "스릴러",
  "미스터리", "드라마", "액션", "호러", "역사",
  "무협", "스포츠", "음악", "요리", "여행",
];

const ADULT_GENRES = ["성인로맨스", "성인판타지", "성인드라마"];

const STYLE_PRESETS = [
  { label: "빠른 전개", desc: "긴장감 있고 속도감 있는 문체" },
  { label: "감성적", desc: "섬세한 감정 묘사, 여운 있는 문장" },
  { label: "하드보일드", desc: "건조하고 냉정한 시점, 간결한 문장" },
  { label: "유머러스", desc: "코믹한 상황, 가벼운 톤" },
  { label: "서정적", desc: "시적인 표현, 풍경 묘사 중심" },
  { label: "스릴러풍", desc: "긴장감 극대화, 반전 중심" },
];

export default function NewStoryPage() {
  const router = useRouter();
  const { nickname } = useMyNickname();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"info" | "guide" | "write">("info");

  // info 단계
  const [title, setTitle] = useState("");
  const [genres, setGenres] = useState<string[]>(["SF"]);
  const [hook, setHook] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // guide 단계
  const [characters, setCharacters] = useState<{ name: string; role: string; desc: string }[]>([{ name: "", role: "주인공", desc: "" }]);
  const [setting, setSetting] = useState("");
  const [conflict, setConflict] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [customStyle, setCustomStyle] = useState("");

  // write 단계
  const [content, setContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("생성 중...");
  const [aiDirection, setAiDirection] = useState("");
  const [aiMode, setAiMode] = useState<"generate" | "continue" | "edit" | null>(null);
  const [editStyle, setEditStyle] = useState("");

  useEffect(() => {
    async function init() {
      const { loadStateFromSupabase, seedSupabaseIfEmpty } = await import("@/lib/supabaseStore");
      const { SEED_DATA } = await import("@/lib/seed");

      const supabaseState = await loadStateFromSupabase();
      if (supabaseState && supabaseState.stories.length > 0) {
        setAppState(supabaseState);
      } else {
        await seedSupabaseIfEmpty(SEED_DATA.stories);
        const retryState = await loadStateFromSupabase();
        if (retryState && retryState.stories.length > 0) {
          setAppState(retryState);
        } else {
          const { seedIfEmpty } = await import("@/lib/seed");
          const localState = seedIfEmpty();
          setAppState(localState);
        }
      }
      if (nickname) setAuthorName(nickname);
      setMounted(true);
    }
    init();
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

  function addCharacter() {
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

  const handleAiGenerate = async () => {
    if (!title.trim()) return;
    setAiLoading(true);
    setAiStatus("스토리 설계 중...");

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

    let finalDirection = "";
    let prevEpisodes = "";
    let currentEp = "";

    if (aiMode === "generate") {
      finalDirection = guideContext
        ? `${guideContext}${aiDirection.trim() ? `\n\n추가 방향: ${aiDirection.trim()}` : ""}`
        : aiDirection.trim() || `${genreString} 장르의 웹소설 1화. 독자를 몰입시키는 강렬한 오프닝.`;
      prevEpisodes = "";
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
      setAiStatus("초안 생성 중...");
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: title,
          previousEpisodes: prevEpisodes,
          currentEpisode: currentEp,
          direction: finalDirection,
        }),
      });
      const data = await res.json();
      setAiStatus("리라이팅 중...");
      if (data.content) setContent(data.content);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
      setAiMode(null);
      setAiDirection("");
      setEditStyle("");
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
    import("@/lib/supabaseStore").then(({ saveStoryToSupabase }) => {
      saveStoryToSupabase(newStory);
    });
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
      <div className="w-full bg-black text-white flex flex-col" style={{ height: "100dvh" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <button onClick={() => router.back()} className="text-white/50 text-sm hover:text-white transition-colors">
            ← 뒤로
          </button>
          <p className="text-white/80 text-sm font-medium">새 작품 (1/3)</p>
          <button
            onClick={() => { if (title.trim() && hook.trim()) setStep("guide"); }}
            disabled={!title.trim() || !hook.trim()}
            className="text-sm font-medium text-white/60 hover:text-white disabled:opacity-20 transition-colors"
          >
            다음 →
          </button>
        </div>

        <div className="px-6 py-8 flex flex-col gap-6 max-w-lg mx-auto flex-1 overflow-y-auto">
          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-2">제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-base" />
          </div>

          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-2">작가명</label>
            <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="작가 이름"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-base" />
          </div>

          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-3">
              장르 <span className="text-white/20">(최대 3개)</span>
            </label>
            <p className="text-white/20 text-xs mb-2 tracking-widest">일반</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {GENERAL_GENRES.map((g) => {
                const selected = genres.includes(g);
                const maxed = genres.length >= 3 && !selected;
                return (
                  <button key={g} onClick={() => toggleGenre(g)} disabled={maxed}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selected ? "bg-white text-black border-white font-medium"
                      : maxed ? "border-white/5 text-white/20 cursor-not-allowed"
                      : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"
                    }`}>
                    {g}
                  </button>
                );
              })}
            </div>
            <p className="text-white/20 text-xs mb-2 tracking-widest">성인 🔞</p>
            <div className="flex flex-wrap gap-2">
              {ADULT_GENRES.map((g) => (
                <button key={g} onClick={() => toggleGenre(g)}
                  className="px-3 py-1.5 rounded-full text-sm border border-white/10 text-white/20 cursor-not-allowed">
                  🔒 {g}
                </button>
              ))}
            </div>
            {genres.length > 0 && <p className="text-white/30 text-xs mt-3">선택됨: {genreString}</p>}
          </div>

          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-2">한 줄 소개</label>
            <input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="독자를 끌어당기는 한 문장"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-base" />
          </div>

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
        </div>
      </div>
    );
  }

  // ── GUIDE 단계 ─────────────────────────────────────
  if (step === "guide") {
    return (
      <div className="w-full bg-black text-white flex flex-col" style={{ height: "100dvh" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <button onClick={() => setStep("info")} className="text-white/50 text-sm hover:text-white transition-colors">
            ← 뒤로
          </button>
          <p className="text-white/80 text-sm font-medium">스토리 가이드 (2/3)</p>
          <button
            onClick={() => setStep("write")}
            className="text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            다음 →
          </button>
        </div>

        <div className="px-6 py-8 flex flex-col gap-6 max-w-lg mx-auto flex-1 overflow-y-auto">

          <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/50 text-xs leading-relaxed">
              작성하지 않아도 돼요. 입력할수록 AI가 더 정확하게 초안을 만들어줍니다.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 w-full">
              <label className="text-white/40 text-xs tracking-widest flex-shrink-0">
                등장인물 <span className="text-white/20">(선택)</span>
              </label>
              <button
                onClick={addCharacter}
                disabled={characters.length >= 5}
                className="text-white/30 text-xs hover:text-white/60 transition-colors px-2 py-1 rounded border border-white/10 hover:border-white/30 flex-shrink-0 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                + 추가
              </button>
            </div>
            <div className="flex flex-col gap-2 w-full overflow-hidden">
              {characters.map((char, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <select
                    value={char.role}
                    onChange={(e) => updateCharacter(i, "role", e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/60 focus:outline-none focus:border-white/30 text-xs shrink-0"
                  >
                    <option value="주인공">주인공</option>
                    <option value="조연">조연</option>
                    <option value="악역">악역</option>
                    <option value="기타">기타</option>
                  </select>
                  <input
                    value={char.name}
                    onChange={(e) => updateCharacter(i, "name", e.target.value)}
                    placeholder="이름"
                    className="w-20 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-sm shrink-0"
                  />
                  <input
                    value={char.desc}
                    onChange={(e) => updateCharacter(i, "desc", e.target.value)}
                    placeholder="특징 (예: 냉소적, 비밀을 숨기고 있음)"
                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-sm truncate"
                  />
                  {characters.length > 1 && (
                    <button
                      onClick={() => removeCharacter(i)}
                      className="text-white/20 hover:text-red-400/60 transition-colors text-sm pt-2.5 shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-1">
              세계관 / 배경 <span className="text-white/20">(선택)</span>
            </label>
            <p className="text-white/20 text-xs mb-2">전체 작품의 배경과 세계관을 적어주세요</p>
            <input
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              placeholder="예: 2047년 화성 탐사 이후 지구 대기권 밖 통신 기지"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-sm"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-1">
              이번 화에서 일어날 일 <span className="text-white/20">(선택)</span>
            </label>
            <p className="text-white/20 text-xs mb-2">이 화에서 반드시 일어나야 할 사건이나 장면을 적어주세요. 구체적일수록 AI가 잘 따라요</p>
            <textarea
              value={conflict}
              onChange={(e) => setConflict(e.target.value)}
              placeholder="예: 하은이 수상한 신호를 수신하고, 상관에게 보고할지 숨길지 고민한다"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs tracking-widest block mb-3">
              작가 스타일 <span className="text-white/20">(선택)</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {STYLE_PRESETS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setWritingStyle(writingStyle === s.label ? "" : s.label)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    writingStyle === s.label
                      ? "bg-white/15 border-white/40 text-white/90"
                      : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/60"
                  }`}
                  title={s.desc}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <input
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              placeholder="예: 무라카미 하루키 스타일, 1인칭 시점, 짧은 문장"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 text-sm"
            />
            {(writingStyle || customStyle) && (
              <p className="text-white/30 text-xs mt-2">
                적용될 스타일: {customStyle || writingStyle}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── WRITE 단계 ─────────────────────────────────────
  return (
    <div className="w-full bg-black text-white flex flex-col" style={{ height: "100dvh" }}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <button onClick={() => setStep("guide")} className="text-white/50 text-sm hover:text-white transition-colors">
          ← 뒤로
        </button>
        <div className="text-center">
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-white/30 text-xs">1화 작성 (3/3)</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={!content.trim()}
          className="text-sm font-medium text-white/60 hover:text-white disabled:opacity-20 transition-colors"
        >
          출판
        </button>
      </div>

      <div className="px-6 py-6 flex flex-col gap-6 max-w-lg mx-auto flex-1 overflow-y-auto pb-28">

        {(characters.filter((c) => c.name.trim()).length > 0 || setting || conflict || writingStyle || customStyle) && (
          <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/30 text-xs mb-2 tracking-widest">스토리 가이드 적용됨</p>
            <div className="flex flex-col gap-1">
              {characters.filter((c) => c.name.trim()).length > 0 && (
                <p className="text-white/40 text-xs">
                  👤 {characters.filter((c) => c.name.trim()).map((c) => `${c.role} ${c.name}`).join(", ")}
                </p>
              )}
              {setting && <p className="text-white/40 text-xs">🌍 {setting}</p>}
              {conflict && <p className="text-white/40 text-xs">⚡ {conflict}</p>}
              {(customStyle || writingStyle) && (
                <p className="text-white/40 text-xs">✍️ {customStyle || writingStyle}</p>
              )}
            </div>
          </div>
        )}

        {/* AI 도구 */}
        <div className="flex flex-col gap-2">
          {/* 버튼 행 */}
          {aiMode === null && (
            <div className="flex gap-2">
              {/* 초안 생성 — 본문 비어있을 때만 */}
              {!content.trim() && (
                <button
                  onClick={() => setAiMode("generate")}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-xs hover:border-white/30 hover:text-white/60 transition-all"
                >
                  ✦ 초안 생성
                </button>
              )}
              {/* 이어쓰기 — 본문 있을 때만 */}
              {content.trim() && (
                <button
                  onClick={() => setAiMode("continue")}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-xs hover:border-white/30 hover:text-white/60 transition-all"
                >
                  ✦ 이어쓰기
                </button>
              )}
              {/* 편집 — 본문 있을 때만 */}
              {content.trim() && (
                <button
                  onClick={() => setAiMode("edit")}
                  className="flex-1 py-2.5 rounded-xl border border-amber-400/20 text-amber-400/40 text-xs hover:border-amber-400/40 hover:text-amber-400/70 transition-all"
                >
                  ✦ AI 편집
                </button>
              )}
            </div>
          )}

          {/* 초안 생성 / 이어쓰기 패널 */}
          {(aiMode === "generate" || aiMode === "continue") && (
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/40 text-xs">
                {aiMode === "generate" ? "✦ AI 초안 생성" : "✦ AI 이어쓰기"}
              </p>
              <textarea
                value={aiDirection}
                onChange={(e) => setAiDirection(e.target.value)}
                placeholder={
                  aiMode === "generate"
                    ? "추가 방향 입력 (선택) — 가이드 내용이 자동 반영됩니다"
                    : "이어쓸 방향 입력 (선택) — 이전 문체가 유지됩니다"
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 placeholder-white/20 focus:outline-none focus:border-white/30 text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAiGenerate}
                  disabled={aiLoading}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-all disabled:opacity-50"
                >
                  {aiLoading ? aiStatus : aiMode === "generate" ? "생성하기" : "이어쓰기"}
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
                  disabled={aiLoading || !editStyle}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400/10 text-amber-400/70 text-sm hover:bg-amber-400/20 transition-all disabled:opacity-30"
                >
                  {aiLoading ? aiStatus : "편집하기"}
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

        <div className="flex-shrink-0 bg-black border-t border-white/10 py-4 px-6">
          <button
            onClick={handleCreate}
            disabled={!content.trim()}
            className="w-full py-4 rounded-2xl bg-white text-black font-bold text-base disabled:opacity-20 hover:bg-white/90 active:scale-95 transition-all"
          >
            {content.trim() ? "출판하기" : "본문을 작성해주세요"}
          </button>
        </div>

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
