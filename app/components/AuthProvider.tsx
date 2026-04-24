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

async function resolveNickname(user: User): Promise<string> {
  // 1순위: profiles 테이블
  const { data, error } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  if (data?.nickname) {
    console.log("[AuthProvider] profiles에서 닉네임 로드:", data.nickname);
    return data.nickname;
  }

  if (error) {
    console.warn("[AuthProvider] profiles 조회 실패:", error.message);
  }

  // 2순위: signUp 시 저장한 user_metadata
  const metaNickname = user.user_metadata?.nickname as string | undefined;
  if (metaNickname) {
    console.log("[AuthProvider] user_metadata에서 닉네임 로드:", metaNickname);
    // profiles에 없으면 여기서 insert 시도
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, nickname: metaNickname });
    if (upsertError) {
      console.error("[AuthProvider] profiles 백필 실패:", upsertError.message);
    }
    return metaNickname;
  }

  // 3순위: 이메일 앞부분 (최후 fallback)
  return user.email?.split("@")[0] ?? "익명";
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const nick = await resolveNickname(u);
        setNickname(nick);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          const nick = await resolveNickname(u);
          setNickname(nick);
        } else {
          setNickname(null);
        }
      },
    );

    return () => subscription.unsubscribe();
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
