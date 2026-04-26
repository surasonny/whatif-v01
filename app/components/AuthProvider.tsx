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
  nickname: string;
  loading: boolean;
  signOut: () => Promise<void>;
  openAuthModal: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  nickname: "",
  loading: true,
  signOut: async () => {},
  openAuthModal: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function nickFromUser(user: User): string {
  return (
    (user.user_metadata?.nickname as string | undefined) ??
    user.email?.split("@")[0] ??
    "익명"
  );
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [nickname, setNickname]   = useState("");
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 초기 세션 — 성공/실패 무관하게 finally에서 loading 해제
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) setNickname(nickFromUser(u));
      })
      .catch((e) => {
        console.error("[AuthProvider] getSession 실패:", e);
      })
      .finally(() => {
        setLoading(false);
      });

    // 이후 상태 변화 (로그인/로그아웃)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        setNickname(u ? nickFromUser(u) : "");
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut  = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const openAuthModal  = useCallback(() => setShowModal(true), []);

  return (
    <AuthContext.Provider value={{ user, nickname, loading, signOut: handleSignOut, openAuthModal }}>
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
