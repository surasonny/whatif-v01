"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const NICKNAME_KEY = "whatif_nickname";
const NICKNAME_MAX = 10;

interface Universe {
  id: string;
  label: string;
  isMain: boolean;
}

interface Props {
  storyId: string;
  episode: number;
  universes: Universe[];
  onClose: () => void;
}

type Phase = "no-nickname" | "can-vote" | "voted";

export default function VotePanel({ storyId, episode, universes, onClose }: Props) {
  const [nickname, setNickname] = useState("");
  const [phase, setPhase] = useState<Phase>("no-nickname");
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 마운트 직후 phantom-click으로 즉시 닫히는 문제 방지
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    let saved = "";
    try { saved = localStorage.getItem(NICKNAME_KEY) ?? ""; } catch {}
    if (saved) {
      setNickname(saved);
      setPhase("can-vote");
      loadVotes(saved);
    } else {
      setPhase("no-nickname");
    }
  }, []);

  async function loadVotes(nick: string) {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("votes")
        .select("universe_id, nickname")
        .eq("story_id", storyId)
        .eq("episode", episode);

      if (error) throw error;

      const counts: Record<string, number> = {};
      let total = 0;
      for (const row of rows ?? []) {
        counts[row.universe_id] = (counts[row.universe_id] ?? 0) + 1;
        total++;
      }
      setVoteCounts(counts);
      setTotalVotes(total);

      const mine = (rows ?? []).find((r) => r.nickname === nick);
      if (mine) {
        setChosenId(mine.universe_id);
        setPhase("voted");
      }
    } catch (e) {
      console.error("[VotePanel] 투표 불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleSetNickname() {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    try { localStorage.setItem(NICKNAME_KEY, trimmed); } catch {}
    setNickname(trimmed);
    setPhase("can-vote");
    loadVotes(trimmed);
  }

  async function handleVote(universeId: string) {
    if (phase !== "can-vote" || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.from("votes").insert({
        story_id: storyId,
        episode,
        universe_id: universeId,
        nickname,
      });

      if (error) {
        if (error.code === "23505") {
          setErrorMsg("이미 투표하셨습니다.");
          setChosenId(universeId);
          setPhase("voted");
        } else {
          throw error;
        }
      } else {
        setVoteCounts((prev) => ({
          ...prev,
          [universeId]: (prev[universeId] ?? 0) + 1,
        }));
        setTotalVotes((prev) => prev + 1);
        setChosenId(universeId);
        setPhase("voted");
      }
    } catch (e) {
      console.error("[VotePanel] 투표 저장 실패:", e);
      setErrorMsg("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const mainUniverse = universes.find((u) => u.isMain);
  const challengers = universes.filter((u) => !u.isMain);

  const blockAll = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    blockAll(e);
    if (Date.now() - mountTimeRef.current < 300) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 99999, backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={handleBackdropClick}
      onPointerDown={blockAll}
      onTouchStart={blockAll}
      onMouseDown={blockAll}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl px-6 pt-5 pb-10 max-h-[90vh] overflow-y-auto border-t border-amber-400/20"
        style={{ zIndex: 99999, backgroundColor: "#0a0a0a" }}
        onClick={blockAll}
        onPointerDown={blockAll}
        onTouchStart={blockAll}
        onMouseDown={blockAll}
      >
        {/* 드래그 핸들 */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-amber-400 font-black text-lg leading-tight">⚔ 독자 투표</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>어떤 세계관이 정사가 되어야 할까요?</p>
          </div>
          <button
            onClick={(e) => { blockAll(e); onClose(); }}
            onPointerDown={blockAll}
            onMouseDown={blockAll}
            className="text-lg leading-none mt-0.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            ✕
          </button>
        </div>

        {/* 참여자 수 */}
        {!loading && (
          <p className="text-xs text-center mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            {totalVotes > 0 ? `총 ${totalVotes}명 참여` : "아직 투표가 없습니다"}
          </p>
        )}

        {/* ── 상태 A: 닉네임 없음 ── */}
        {phase === "no-nickname" && (
          <div className="mb-5 p-4 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-sm text-center mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              닉네임을 설정하면 투표할 수 있습니다
            </p>
            <input
              type="text"
              placeholder={`닉네임 입력 (최대 ${NICKNAME_MAX}자)`}
              maxLength={NICKNAME_MAX}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetNickname()}
              autoFocus
              className="w-full bg-transparent text-white text-sm py-2 mb-4 outline-none"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.2)" }}
            />
            <button
              onClick={(e) => { blockAll(e); handleSetNickname(); }}
              onPointerDown={blockAll}
              onMouseDown={blockAll}
              disabled={!nickname.trim()}
              className="w-full py-2.5 rounded-xl text-amber-400 text-sm font-semibold transition-all active:scale-95"
              style={{ backgroundColor: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.3)" }}
            >
              설정하기
            </button>
          </div>
        )}

        {/* ── 상태 B/C: 닉네임 안내 ── */}
        {phase !== "no-nickname" && nickname && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{nickname} 님</span>
            {phase === "voted" && (
              <span className="text-xs px-2 py-0.5 rounded-full text-amber-400" style={{ backgroundColor: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)", opacity: 0.7 }}>
                투표 완료 ✓
              </span>
            )}
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>집계 불러오는 중…</p>
          </div>
        )}

        {/* ── 투표 카드 (상태 B, C) ── */}
        {!loading && phase !== "no-nickname" && (
          <div className="flex flex-col gap-3">
            {mainUniverse && (
              <UniverseCard
                universe={mainUniverse}
                voteCount={voteCounts[mainUniverse.id] ?? 0}
                totalVotes={totalVotes}
                isMyChoice={chosenId === mainUniverse.id}
                canVote={phase === "can-vote"}
                submitting={submitting}
                onVote={handleVote}
                blockAll={blockAll}
              />
            )}

            {challengers.length > 0 && (
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>VS</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
              </div>
            )}

            {challengers.map((u) => (
              <UniverseCard
                key={u.id}
                universe={u}
                voteCount={voteCounts[u.id] ?? 0}
                totalVotes={totalVotes}
                isMyChoice={chosenId === u.id}
                canVote={phase === "can-vote"}
                submitting={submitting}
                onVote={handleVote}
                blockAll={blockAll}
              />
            ))}
          </div>
        )}

        {errorMsg && (
          <p className="text-center text-xs mt-4" style={{ color: "rgba(248,113,113,0.6)" }}>{errorMsg}</p>
        )}

        {phase === "voted" && !errorMsg && (
          <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            투표는 변경할 수 없습니다
          </p>
        )}
      </div>
    </div>
  );
}

function UniverseCard({
  universe,
  voteCount,
  totalVotes,
  isMyChoice,
  canVote,
  submitting,
  onVote,
  blockAll,
}: {
  universe: Universe;
  voteCount: number;
  totalVotes: number;
  isMyChoice: boolean;
  canVote: boolean;
  submitting: boolean;
  onVote: (id: string) => void;
  blockAll: (e: React.SyntheticEvent) => void;
}) {
  const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
  const { isMain } = universe;

  const borderColor = isMyChoice
    ? isMain ? "rgba(255,255,255,0.6)" : "rgba(251,191,36,0.7)"
    : canVote
    ? isMain ? "rgba(255,255,255,0.15)" : "rgba(251,191,36,0.2)"
    : isMain ? "rgba(255,255,255,0.08)" : "rgba(251,191,36,0.1)";

  const bgColor = isMyChoice
    ? isMain ? "rgba(255,255,255,0.1)" : "rgba(251,191,36,0.1)"
    : canVote
    ? isMain ? "rgba(255,255,255,0.05)" : "rgba(251,191,36,0.05)"
    : "transparent";

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (canVote && !submitting) onVote(universe.id);
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseDown={(e) => { e.preventDefault(); blockAll(e); }}
      onPointerDown={(e) => { e.preventDefault(); blockAll(e); }}
      onTouchStart={(e) => { e.preventDefault(); blockAll(e); }}
      className="p-4 rounded-2xl transition-all duration-150"
      style={{
        border: `1px solid ${borderColor}`,
        backgroundColor: bgColor,
        cursor: canVote ? "pointer" : "default",
        opacity: !canVote && !isMyChoice ? 0.6 : 1,
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: isMain ? "rgba(255,255,255,0.85)" : "rgba(251,191,36,0.85)" }}>
            {universe.label}
          </span>
          {isMain && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}>
              현재 정사
            </span>
          )}
          {isMyChoice && (
            <span className="text-xs font-bold" style={{ color: isMain ? "rgba(255,255,255,0.7)" : "rgb(251,191,36)" }}>
              ✓ 내 선택
            </span>
          )}
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color: isMyChoice ? (isMain ? "rgba(255,255,255,0.8)" : "rgb(251,191,36)") : "rgba(255,255,255,0.3)" }}>
          {voteCount}표
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isMain ? "rgba(255,255,255,0.1)" : "rgba(251,191,36,0.1)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: isMain ? "rgba(255,255,255,0.5)" : "rgba(251,191,36,0.6)",
            }}
          />
        </div>
        <span className="text-xs tabular-nums w-10 text-right" style={{ color: isMyChoice ? (isMain ? "rgba(255,255,255,0.6)" : "rgba(251,191,36,0.7)") : "rgba(255,255,255,0.2)" }}>
          {totalVotes > 0 ? `${Math.round(pct)}%` : "—"}
        </span>
      </div>
    </div>
  );
}
