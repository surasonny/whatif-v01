"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { upsertProfile } from "@/lib/auth";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const [tab, setTab]           = useState<"login" | "signup">("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const mountTimeRef            = useRef(Date.now());

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onSuccess();
    } catch (e: any) {
      setError(
        e.message?.includes("Invalid login credentials")
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : "로그인 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!nickname.trim()) { setError("닉네임을 입력해주세요."); return; }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        await upsertProfile(data.user.id, nickname.trim());
      }
      onSuccess();
    } catch (e: any) {
      setError(
        e.message?.includes("already registered") || e.message?.includes("already been registered")
          ? "이미 가입된 이메일입니다."
          : "가입 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-[200000]"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={() => {
        if (Date.now() - mountTimeRef.current < 300) return;
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-t-2xl px-6 pt-6 pb-12 border-t border-white/10"
        style={{ backgroundColor: "#0a0a0a" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-white font-bold text-base">계정</p>
          <button
            onClick={onClose}
            className="text-white/30 text-lg hover:text-white/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div className="flex mb-6 gap-1 p-1 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: tab === t ? "rgba(255,255,255,0.1)" : "transparent",
                color: tab === t ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
              }}
            >
              {t === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="이메일"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-white text-sm py-3 outline-none"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tab === "login" && handleLogin()}
            className="w-full bg-transparent text-white text-sm py-3 outline-none"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
          />
          {tab === "signup" && (
            <input
              type="text"
              placeholder="닉네임 (최대 10자)"
              maxLength={10}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignup()}
              className="w-full bg-transparent text-white text-sm py-3 outline-none"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
            />
          )}

          {error && (
            <p className="text-xs text-center" style={{ color: "rgba(248,113,113,0.8)" }}>
              {error}
            </p>
          )}

          <button
            onClick={tab === "login" ? handleLogin : handleSignup}
            disabled={loading || !email || !password}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 mt-1"
            style={{
              backgroundColor: "rgba(251,191,36,0.18)",
              border: "1px solid rgba(251,191,36,0.4)",
              color: "rgb(251,191,36)",
              opacity: loading || !email || !password ? 0.45 : 1,
            }}
          >
            {loading ? "처리 중…" : tab === "login" ? "로그인" : "가입하기"}
          </button>

          {/* 구글 소셜 로그인 — 향후 추가
          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })}
            className="w-full py-3 rounded-xl text-sm font-medium border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all mt-1"
          >
            Google로 계속하기
          </button>
          */}
        </div>
      </div>
    </div>
  );
}
