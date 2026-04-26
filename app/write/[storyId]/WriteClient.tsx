"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";

interface Universe {
  id: string;
  label: string;
  isMain: boolean;
  episodes: Episode[];
  [key: string]: unknown;
}

interface Episode {
  index: number;
  title: string;
  content: string;
  coverImageUrl?: string;
  remixAllowed: boolean;
  likes: number;
  dislikes: number;
}

export default function WriteClient() {
  const params  = useParams();
  const router  = useRouter();
  const storyId = params.storyId as string;

  const { user, authLoading } = useAuth();

  const [universes, setUniverses] = useState<Universe[] | null>(null);
  const [authorId, setAuthorId]   = useState<string | null>(null);
  const [title, setTitle]         = useState("");
  const [content, setContent]     = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    supabase
      .from("stories")
      .select("universes, author_id")
      .eq("id", storyId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError("작품을 찾을 수 없습니다."); setLoading(false); return; }
        setAuthorId(data.author_id ?? null);
        setUniverses(data.universes as Universe[]);
        setLoading(false);
      });
  }, [storyId, authLoading]);

  useEffect(() => {
    if (loading || authLoading) return;
    if (!user) { router.replace("/"); return; }
    if (authorId && authorId !== user.id) { router.replace("/"); }
  }, [loading, authLoading, user, authorId, router]);

  const handleSave = async () => {
    if (!universes || saving || !title.trim() || !content.trim()) return;
    setSaving(true);

    const updated = universes.map((u) => {
      if (!u.isMain) return u;
      const nextIndex = u.episodes.length;
      const newEp: Episode = {
        index: nextIndex,
        title: title.trim(),
        content: content.trim(),
        coverImageUrl: coverImageUrl.trim() || undefined,
        remixAllowed: true,
        likes: 0,
        dislikes: 0,
      };
      return { ...u, episodes: [...u.episodes, newEp] };
    });

    const { error: err } = await supabase
      .from("stories")
      .update({ universes: updated, updated_at: new Date().toISOString() })
      .eq("id", storyId);

    setSaving(false);
    if (err) { setError("저장에 실패했습니다."); return; }

    const mainU = updated.find((u) => u.isMain) ?? updated[0];
    const newEpIndex = mainU.episodes.length - 1;
    router.push(`/reader/${storyId}/${newEpIndex}`);
  };

  const handleCancel = () => router.back();

  if (loading || authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white/50 text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-red-400/70 text-sm">{error}</p>
      </div>
    );
  }

  const mainU    = universes?.find((u) => u.isMain) ?? universes?.[0];
  const nextNum  = (mainU?.episodes.length ?? 0) + 1;

  return (
    <div className="w-full min-h-screen bg-black flex flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
        <button
          onClick={handleCancel}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          ← 취소
        </button>
        <span className="text-white/40 text-xs">{nextNum}화 새로 쓰기</span>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !content.trim()}
          className="text-sm font-semibold px-4 py-1.5 rounded-full disabled:opacity-30 transition-all active:scale-95"
          style={{ backgroundColor: saving ? "rgba(255,255,255,0.1)" : "white", color: "black" }}
        >
          {saving ? "저장 중..." : "발행"}
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex flex-col px-6 py-6 gap-4 max-w-prose mx-auto w-full">
        <input
          type="text"
          placeholder="에피소드 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent border-b border-white/20 text-white text-xl font-bold py-2 outline-none placeholder:text-white/20 focus:border-white/50 transition-colors"
        />

        <textarea
          placeholder="내용을 입력하세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full bg-transparent text-white/85 text-[17px] leading-[1.9] outline-none resize-none placeholder:text-white/20 font-light tracking-wide"
          style={{ minHeight: 400 }}
        />

        <div className="border-t border-white/10 pt-4">
          <p className="text-white/30 text-xs mb-2">커버 이미지 URL (선택)</p>
          <input
            type="url"
            placeholder="https://..."
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            className="w-full bg-white/5 rounded-xl text-white/60 text-sm px-4 py-3 outline-none placeholder:text-white/20 focus:bg-white/8 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400/70 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
