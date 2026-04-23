"use client";

import { useEffect, useState } from "react";

interface Props {
  fromLabel: string;
  toLabel: string;
  onDone: () => void;
}

export default function CanonWarAlert({ fromLabel, toLabel, onDone }: Props) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 100);
    const t2 = setTimeout(() => setPhase("exit"), 2800);
    const t3 = setTimeout(() => onDone(), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      style={{
        background: phase === "show"
          ? "radial-gradient(ellipse at center, rgba(251,191,36,0.15) 0%, rgba(0,0,0,0.85) 70%)"
          : "transparent",
        transition: "background 0.5s ease",
      }}
    >
      {/* 파티클 효과 */}
      {phase === "show" && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-amber-400"
              style={{
                left: `${10 + i * 7}%`,
                top: `${20 + (i % 3) * 20}%`,
                animation: `float-up ${1 + (i % 3) * 0.5}s ease-out forwards`,
                opacity: 0.6,
                transform: `scale(${1 + (i % 3)})`,
              }}
            />
          ))}
        </div>
      )}

      {/* 메인 팝업 */}
      <div
        className="relative px-8 py-10 rounded-3xl border text-center max-w-sm mx-6"
        style={{
          background: "linear-gradient(135deg, #1a1200 0%, #0a0a0a 100%)",
          borderColor: "rgba(251,191,36,0.4)",
          boxShadow: phase === "show"
            ? "0 0 60px rgba(251,191,36,0.3), 0 0 120px rgba(251,191,36,0.1)"
            : "none",
          transform: phase === "enter"
            ? "scale(0.5) translateY(40px)"
            : phase === "exit"
            ? "scale(0.8) translateY(-20px)"
            : "scale(1) translateY(0)",
          opacity: phase === "enter" ? 0 : phase === "exit" ? 0 : 1,
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <p className="text-amber-400 text-4xl mb-4">⚔</p>
        <p className="text-amber-400 font-black text-xl mb-2 tracking-tight">
          정사가 교체되었습니다
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="text-white/40 text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            {fromLabel}
          </span>
          <span className="text-amber-400 text-lg">→</span>
          <span className="text-white text-sm font-bold px-3 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/30">
            {toLabel}
          </span>
        </div>
        <p className="text-white/30 text-xs mt-4">새로운 정사가 시작됩니다</p>
      </div>

      <style jsx>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-100px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
