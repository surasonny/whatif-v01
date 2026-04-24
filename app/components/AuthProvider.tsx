"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AuthModal from "./AuthModal";

type AuthContextType = {
  user: User | null;
  nickname: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  openAuthModal: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  nickname: null,
  loading: true,
  signOut: async () => {},
  openAuthModal: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchNickname(user: User): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();
  return (
    profile?.nickname ??
    (user.user_metadata?.nickname as string | undefined) ??
    user.email?.split("@")[0] ??
    "익명"
  );
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [nickname, setNickname]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 3초 안에 init 안 끝나면 loading 강제 해제
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn("[AuthProvider] init timeout — loading 강제 해제");
        setLoading(false);
      }
    }, 3000);

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session?.user) {
          setUser(session.user);
          const nick = await fetchNickname(session.user);
          if (!cancelled) setNickname(nick);
        }
      } catch (e) {
        console.error("[AuthProvider] init 에러:", e);
      } finally {
        clearTimeout(safetyTimer);
        if (!cancelled) setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          try {
            const nick = await fetchNickname(u);
            setNickname(nick);
          } catch (e) {
            console.error("[AuthProvider] onAuthStateChange 닉네임 조회 실패:", e);
            setNickname(u.email?.split("@")[0] ?? "익명");
          }
        } else {
          setNickname(null);
        }
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const openAuthModal = useCallback(() => setShowModal(true), []);

  return (
    <AuthContext.Provider
      value={{ user, nickname, loading, signOut: handleSignOut, openAuthModal }}
    >
      {children}
      {showModal && (
        <AuthModal
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </AuthContext.Provider>
  );
}
