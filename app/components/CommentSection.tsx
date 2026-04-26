"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

interface Comment {
  id: string;
  story_id: string;
  episode: number;
  universe_id: string;
  nickname: string;
  user_id: string | null;
  content: string;
  likes: number;
  dislikes: number;
  created_at: string;
}

interface Props {
  storyId: string;
  episode: number;
  universeId: string;
}

const BEST_THRESHOLD = 5;

export default function CommentSection({ storyId, episode, universeId }: Props) {
  const { user, nickname: authNickname, openAuthModal } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("story_id", storyId)
      .eq("episode", episode)
      .order("created_at", { ascending: false });
    if (data) setComments(data as Comment[]);
    setLoading(false);
  }, [storyId, episode]);

  useEffect(() => {
    setLoading(true);
    loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!user || !text.trim() || submitting) return;
    setSubmitting(true);
    const nickname = authNickname || user.email?.split("@")[0] || "익명";
    const { error } = await supabase.from("comments").insert({
      story_id: storyId,
      episode,
      universe_id: universeId,
      nickname,
      user_id: user.id,
      content: text.trim(),
    });
    if (!error) {
      setText("");
      await loadComments();
    }
    setSubmitting(false);
  };

  const handleLike = async (c: Comment) => {
    setComments((prev) => prev.map((x) => x.id === c.id ? { ...x, likes: x.likes + 1 } : x));
    await supabase.from("comments").update({ likes: c.likes + 1 }).eq("id", c.id);
  };

  const handleDislike = async (c: Comment) => {
    setComments((prev) => prev.map((x) => x.id === c.id ? { ...x, dislikes: x.dislikes + 1 } : x));
    await supabase.from("comments").update({ dislikes: c.dislikes + 1 }).eq("id", c.id);
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id);
  };

  const best   = comments.filter((c) => c.likes >= BEST_THRESHOLD).sort((a, b) => b.likes - a.likes);
  const normal = comments.filter((c) => c.likes < BEST_THRESHOLD);

  return (
    <div className="mt-8 border-t border-white/10 pt-8">
      <p className="text-white/40 text-xs tracking-widest mb-6">댓글 {comments.length}개</p>

      {/* 댓글 입력 */}
      <div className="mb-8">
        {!user ? (
          <button
            onClick={openAuthModal}
            className="w-full py-3 rounded-xl border border-white/10 text-white/30 text-sm hover:border-white/20 hover:text-white/50 transition-all"
          >
            로그인하면 댓글을 쓸 수 있습니다
          </button>
        ) : (
          <>
            <textarea
              placeholder="이 화에 대한 생각을 남겨보세요..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full bg-white/5 rounded-xl text-white/80 text-sm p-4 outline-none resize-none placeholder:text-white/20 transition-colors"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-white/30 text-xs">{authNickname || "익명"}</span>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                className="px-5 py-2 rounded-full bg-white/10 text-white/60 text-sm font-medium disabled:opacity-30 hover:bg-white/20 hover:text-white transition-all active:scale-95"
              >
                {submitting ? "..." : "등록"}
              </button>
            </div>
          </>
        )}
      </div>

      {loading && (
        <p className="text-white/20 text-sm text-center py-8">불러오는 중...</p>
      )}

      {!loading && best.length > 0 && (
        <div className="mb-6">
          <p className="text-amber-400/60 text-xs tracking-widest mb-3">👑 베스트 댓글</p>
          {best.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={user?.id}
              isBest
              onLike={() => handleLike(c)}
              onDislike={() => handleDislike(c)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}

      {!loading && comments.length === 0 && (
        <p className="text-white/20 text-sm text-center py-8">첫 번째 댓글을 남겨보세요.</p>
      )}

      {!loading && normal.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          currentUserId={user?.id}
          isBest={false}
          onLike={() => handleLike(c)}
          onDislike={() => handleDislike(c)}
          onDelete={() => handleDelete(c.id)}
        />
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  isBest,
  onLike,
  onDislike,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  isBest: boolean;
  onLike: () => void;
  onDislike: () => void;
  onDelete: () => void;
}) {
  const isOwner = !!currentUserId && comment.user_id === currentUserId;

  return (
    <div
      className={`mb-4 p-4 rounded-xl ${
        isBest ? "bg-amber-400/5 border border-amber-400/20" : "bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs font-medium">{comment.nickname || "익명"}</span>
          {isBest && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/20 text-amber-400/70">
              👑 베스트
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/20 text-xs">
            {new Date(comment.created_at).toLocaleDateString("ko-KR")}
          </span>
          {isOwner && (
            <button
              onClick={onDelete}
              className="text-white/20 text-xs hover:text-red-400/70 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
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
