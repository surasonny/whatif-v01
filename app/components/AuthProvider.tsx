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
import { getProfile } from "@/lib/auth";
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

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 초기 세션 — hydration 이후 클라이언트에서만 실행
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) setNickname(await getProfile(u.id));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          setNickname(await getProfile(u.id));
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
