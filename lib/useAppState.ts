// 앱 전체에서 사용하는 상태 훅
// Supabase를 우선 사용하고, 실패 시 localStorage로 폴백

"use client";

import { useState, useEffect } from "react";
import { AppState } from "./types";
import { seedIfEmpty, SEED_DATA } from "./seed";
import { loadStateFromSupabase, seedSupabaseIfEmpty } from "./supabaseStore";

export function useAppState() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [source, setSource] = useState<"supabase" | "local">("local");

  useEffect(() => {
    async function init() {
      // 1. Supabase에서 로드 시도
      const supabaseState = await loadStateFromSupabase();

      if (supabaseState && supabaseState.stories.length > 0) {
        setAppState(supabaseState);
        setSource("supabase");
      } else {
        // 2. Supabase 비어있으면 seed 업로드 후 사용
        await seedSupabaseIfEmpty(SEED_DATA.stories);
        const retryState = await loadStateFromSupabase();
        if (retryState && retryState.stories.length > 0) {
          setAppState(retryState);
          setSource("supabase");
        } else {
          // 3. 완전 폴백: localStorage
          const localState = seedIfEmpty();
          setAppState(localState);
          setSource("local");
        }
      }
      setMounted(true);
    }
    init();
  }, []);

  return { appState, setAppState, mounted, source };
}
