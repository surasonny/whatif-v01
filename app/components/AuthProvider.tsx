"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AuthModal from "./AuthModal";

type AuthContextType = {
  user: User | null;
  nickname: string;
  authLoading: boolean;
  openAuthModal: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  nickname: "",
  authLoading: false,
  openAuthModal: () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function getNickname(u: User): string {
  return (
    (u.user_metadata?.nickname as string | undefined) ??
    u.email?.split("@")[0] ??
    "익명"
  );
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]             = useState<User | null>(null);
  const [nickname, setNickname]     = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [showModal, setShowModal]   = useState(false);

  useEffect(() => {
    // 초기 세션 확인 — 한 번만
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          setNickname(getNickname(session.user));
        }
        setAuthLoading(false);
      })
      .catch(() => {
        setAuthLoading(false);
      });

    // 이후 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setNickname(session?.user ? getNickname(session.user) : "");
        setAuthLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNickname("");
  }, []);

  const openAuthModal = useCallback(() => setShowModal(true), []);

  return (
    <AuthContext.Provider value={{ user, nickname, authLoading, openAuthModal, signOut: handleSignOut }}>
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
