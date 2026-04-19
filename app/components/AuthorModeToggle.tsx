"use client";

import { useEffect, useState } from "react";

const AUTHOR_MODE_KEY = "whatif_author_mode";

export function useAuthorMode() {
  const [isAuthorMode, setIsAuthorMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTHOR_MODE_KEY);
      setIsAuthorMode(saved === "true");
    } catch {}
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isAuthorMode;
    setIsAuthorMode(next);
    try {
      localStorage.setItem(AUTHOR_MODE_KEY, String(next));
    } catch {}
  };

  return { isAuthorMode: mounted ? isAuthorMode : false, toggle, mounted };
}

export default function AuthorModeToggle() {
  const { isAuthorMode, toggle, mounted } = useAuthorMode();

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
        isAuthorMode
          ? "bg-white text-black"
          : "border border-white/20 text-white/40 hover:border-white/40 hover:text-white/70"
      }`}
    >
      <span>{isAuthorMode ? "✏️" : "👁"}</span>
      <span>{isAuthorMode ? "작가 모드" : "독자 모드"}</span>
    </button>
  );
}
