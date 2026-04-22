"use client";

import { useState, useEffect } from "react";
import { Comment } from "@/lib/types";

const NICKNAME_KEY = "whatif_nickname";

interface Props {
  comments: Comment[];
  storyId: string;
  universeId: string;
  episodeIndex: number;
  allUniverses?: { id: string; label: string }[];
  onAddComment: (content: string, author: string) => void;
  onLikeComment: (commentId: string) => void;
  onDislikeComment: (commentId: string) => void;
}

export default function CommentSection({
  comments,
  storyId,
  universeId,
  episodeIndex,
  allUniverses,
  onAddComment,
  onLikeComment,
  onDislikeComment,
}: Props) {
  const [text, setText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [filterUniverseId, setFilterUniverseId] = useState<string | "all">("all");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NICKNAME_KEY);
      if (saved) setAuthorName(saved);
    } catch {}
  }, []);

  // 유니버스 변경 시 필터 초기화
  useEffect(() => {
    setFilterUniverseId("all");
  }, [universeId]);

  const handleAuthorChange = (value: string) => {
    setAuthorName(value);
    try {
      localStorage.setItem(NICKNAME_KEY, value);
    } catch {}
  };

  // 현재 에피소드의 전체 댓글 (유니버스 무관)
  const allEpisodeComments = comments.filter(
    (c) => (c as any).storyId === storyId && c.episodeIndex === episodeIndex
  );

  // 필터 적용
  const filtered =
    filterUniverseId === "all"
      ? allEpisodeComments
      : allEpisodeComments.filter((c) => c.universeId === filterUniverseId);

  // 베스트: 좋아요 3개 이상
  const best = filtered.filter((c) => c.likes >= 3);
  const normal = filtered.filter((c) => c.likes < 3);

  const sortedBest = [...best].sort((a, b) => b.likes - a.likes);
  const sortedNormal = [...normal].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAddComment(text.trim(), authorName.trim());
    setText("");
  };

  // 유니버스 탭 표시 여부 — 2개 이상일 때만
  const showUniverseTabs = allUniverses && allUniverses.length > 1;

  return (
    <div className="mt-8 border-t border-white/10 pt-8">
      <div className="flex items-center justify-between mb-6">
        <p className="text-white/40 text-xs tracking-widest">
          댓글 {allEpisodeComments.length}
        </p>
        {showUniverseTabs && (
          <p className="text-white/20 text-xs">
            이 화 전체 댓글
          </p>
        )}
      </div>

      {/* 유니버스 필터 탭 */}
      {showUniverseTabs && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterUniverseId("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition-all ${
              filterUniverseId === "all"
                ? "bg-white/10 border-white/30 text-white/80"
                : "border-white/10 text-white/30 hover:border-white/20"
            }`}
          >
            전체
          </button>
          {allUniverses.map((u) => (
            <button
              key={u.id}
              onClick={() => setFilterUniverseId(u.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition-all ${
                filterUniverseId === u.id
                  ? "bg-white/10 border-white/30 text-white/80"
                  : "border-white/10 text-white/30 hover:border-white/20"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}

      {/* 댓글 입력 */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="닉네임 (선택)"
          value={authorName}
          onChange={(e) => handleAuthorChange(e.target.value)}
          className="w-full bg-transparent border-b border-white/10 text-white/60 text-sm py-2 mb-3 outline-none placeholder:text-white/20 focus:border-white/30 transition-colors"
        />
        <textarea
          placeholder="이 화에 대한 생각을 남겨보세요..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full bg-white/5 rounded-xl text-white/80 text-sm p-4 outline-none resize-none placeholder:text-white/20 focus:bg-white/8 transition-colors"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="px-5 py-2 rounded-full bg-white/10 text-white/60 text-sm font-medium disabled:opacity-30 hover:bg-white/20 hover:text-white transition-all active:scale-95"
          >
            등록
          </button>
        </div>
      </div>

      {/* 베스트 댓글 */}
      {sortedBest.length > 0 && (
        <div className="mb-6">
          <p className="text-yellow-400/60 text-xs tracking-widest mb-3">
            ★ 베스트 댓글
          </p>
          {sortedBest.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onLike={() => onLikeComment(c.id)}
              onDislike={() => onDislikeComment(c.id)}
              isBest
              universeLabel={
                showUniverseTabs
                  ? allUniverses?.find((u) => u.id === c.universeId)?.label
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* 댓글 없음 */}
      {filtered.length === 0 && (
        <p className="text-white/20 text-sm text-center py-8">
          첫 번째 댓글을 남겨보세요.
        </p>
      )}

      {/* 일반 댓글 */}
      {sortedNormal.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          onLike={() => onLikeComment(c.id)}
          onDislike={() => onDislikeComment(c.id)}
          isBest={false}
          universeLabel={
            showUniverseTabs
              ? allUniverses?.find((u) => u.id === c.universeId)?.label
              : undefined
          }
        />
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  onLike,
  onDislike,
  isBest,
  universeLabel,
}: {
  comment: Comment;
  onLike: () => void;
  onDislike: () => void;
  isBest: boolean;
  universeLabel?: string;
}) {
  return (
    <div
      className={`mb-4 p-4 rounded-xl ${
        isBest
          ? "bg-yellow-400/5 border border-yellow-400/20"
          : "bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs font-medium">
            {comment.author || "익명"}
          </span>
          {universeLabel && (
            <span className="text-white/20 text-xs px-1.5 py-0.5 rounded bg-white/5">
              {universeLabel}
            </span>
          )}
        </div>
        <span className="text-white/20 text-xs">
          {new Date(comment.createdAt).toLocaleDateString("ko-KR")}
        </span>
      </div>
      <p className="text-white/80 text-sm leading-6 mb-3">{comment.content}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={onLike}
          className="flex items-center gap-1.5 text-white/30 text-xs hover:text-white/70 transition-colors active:scale-95"
        >
          <span>👍</span>
          <span>{comment.likes}</span>
        </button>
        <button
          onClick={onDislike}
          className="flex items-center gap-1.5 text-white/30 text-xs hover:text-white/70 transition-colors active:scale-95"
        >
          <span>👎</span>
          <span>{comment.dislikes}</span>
        </button>
      </div>
    </div>
  );
}
