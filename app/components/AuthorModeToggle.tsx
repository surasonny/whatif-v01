"use client";

import { useEffect, useState } from "react";

const NICKNAME_KEY = "whatif_nickname";

export function useMyNickname() {
  const [nickname, setNickname] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NICKNAME_KEY);
      if (saved) setNickname(saved);
    } catch {}
    setMounted(true);
  }, []);

  const saveNickname = (name: string) => {
    setNickname(name);
    try {
      localStorage.setItem(NICKNAME_KEY, name);
    } catch {}
  };

  return { nickname: mounted ? nickname : "", saveNickname, mounted };
}

export default function NicknameSetup({
  onClose,
}: {
  onClose?: () => void;
}) {
  const { nickname, saveNickname, mounted } = useMyNickname();
  const [input, setInput] = useState("");

  useEffect(() => {
    if (mounted) setInput(nickname);
  }, [mounted, nickname]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-lg bg-zinc-950 rounded-t-2xl px-6 pt-6 pb-10 border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
        <p className="text-white/80 text-sm font-medium mb-2">내 닉네임 설정</p>
        <p className="text-white/30 text-xs mb-6">
          닉네임은 작품 작성자명과 댓글에 사용됩니다.
          내가 작성한 글에만 편집 버튼이 보입니다.
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="닉네임 입력"
          className="w-full bg-white/5 rounded-xl text-white/90 text-base p-4 outline-none placeholder:text-white/20 border border-white/10 focus:border-white/30 transition-colors"
          autoFocus
        />
        <button
          onClick={() => {
            if (input.trim()) {
              saveNickname(input.trim());
              onClose?.();
            }
          }}
          disabled={!input.trim()}
          className="w-full mt-4 py-4 rounded-2xl bg-white text-black font-semibold text-base disabled:opacity-30 hover:bg-white/90 active:scale-95 transition-all"
        >
          저장
        </button>
      </div>
    </div>
  );
}
