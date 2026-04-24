"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

// ── 정사 전환 조건 (테스트값 — 프로덕션: 10, 0.6) ──────────────
const TRANSFER_MIN_VOTES = 1;
const TRANSFER_MIN_PCT   = 0.5;

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
  onTransferComplete?: (toUniverseId: string) => void;
  onVoteCast?: () => void;
}

type Phase = "no-auth" | "can-vote" | "voted";

export default function VotePanel({
  storyId,
  episode,
  universes,
  onClose,
  onTransferComplete,
  onVoteCast,
}: Props) {
  const { user, nickname: authNickname, loading: authLoading, openAuthModal } = useAuth();

  const [phase, setPhase]           = useState<Phase>("no-auth");
  const [chosenId, setChosenId]     = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  const mountTimeRef      = useRef(Date.now());
  const transferCalledRef = useRef(false);

  // auth 상태가 확정된 후 투표 데이터 로드
  useEffect(() => {
    if (authLoading) return;
    if (!authNickname) {
      setPhase("no-auth");
      return;
    }
    loadVotes(authNickname);
  }, [authNickname, authLoading]);

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
      console.log("[VotePanel init] phase:", mine ? "voted" : "can-vote", "chosenId:", mine?.universe_id ?? null);

      if (mine) {
        setChosenId(mine.universe_id);
        setPhase("voted");
      } else {
        setPhase("can-vote");
      }

      // 패널 오픈 시점에도 전환 조건 체크 (투표 현황 보기로 열었을 때도 실행)
      await checkAndTransfer(counts, total);
    } catch (e) {
      console.error("[VotePanel] 투표 불러오기 실패:", e);
      setPhase("can-vote");
    } finally {
      setLoading(false);
    }
  }

  async function checkAndTransfer(
    counts: Record<string, number>,
    total: number,
  ) {
    if (!onTransferComplete) return;
    if (transferCalledRef.current) return;
    if (total < TRANSFER_MIN_VOTES) return;

    const mainU = universes.find((u) => u.isMain);
    if (!mainU) return;

    const challengers = universes.filter((u) => !u.isMain);
    if (challengers.length === 0) return;

    const winner = challengers.reduce((best, u) =>
      (counts[u.id] ?? 0) > (counts[best.id] ?? 0) ? u : best,
      challengers[0],
    );

    const winnerPct = (counts[winner.id] ?? 0) / total;
    if (winnerPct < TRANSFER_MIN_PCT) return;

    // main_transfers 테이블에 이미 이 에피소드 전환 기록이 있으면 스킵
    try {
      const { data: existing } = await supabase
        .from("main_transfers")
        .select("id")
        .eq("story_id", storyId)
        .eq("episode", episode)
        .limit(1);

      if (existing && existing.length > 0) {
        transferCalledRef.current = true;
        return;
      }
    } catch {
      // 조회 실패 시에도 전환 시도 계속
    }

    transferCalledRef.current = true;

    try {
      await supabase.from("main_transfers").insert({
        story_id:         storyId,
        episode,
        from_universe_id: mainU.id,
        to_universe_id:   winner.id,
        trigger:          "vote",
      });
    } catch (e) {
      console.error("[VotePanel] main_transfers 기록 실패:", e);
    }

    onTransferComplete(winner.id);
  }

  async function handleVote(universeId: string) {
    if (phase !== "can-vote" || submitting || !authNickname) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.from("votes").insert({
        story_id:    storyId,
        episode,
        universe_id: universeId,
        nickname:    authNickname,
      });

      if (error) {
        if (error.code === "23505") {
          setErrorMsg("이미 투표하셨습니다.");
          setChosenId(universeId);
          setPhase("voted");
          onVoteCast?.();
        } else {
          throw error;
        }
      } else {
        const newCounts = {
          ...voteCounts,
          [universeId]: (voteCounts[universeId] ?? 0) + 1,
        };
        const newTotal = totalVotes + 1;
        setVoteCounts(newCounts);
        setTotalVotes(newTotal);
        setChosenId(universeId);
        setPhase("voted");
        onVoteCast?.();
        await checkAndTransfer(newCounts, newTotal);
      }
    } catch (e) {
      console.error("[VotePanel] 투표 저장 실패:", e);
      setErrorMsg("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const mainUniverse = universes.find((u) => u.isMain);
  const challengers  = universes.filter((u) => !u.isMain);

  // 전환 조건 달성 여부
  const conditionMet = (() => {
    if (totalVotes < TRANSFER_MIN_VOTES) return false;
    if (challengers.length === 0) return false;
    const top = challengers.reduce((best, u) =>
      (voteCounts[u.id] ?? 0) > (voteCounts[best.id] ?? 0) ? u : best,
      challengers[0],
    );
    return (voteCounts[top.id] ?? 0) / totalVotes >= TRANSFER_MIN_PCT;
  })();

  const isLoading = loading || authLoading;

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

        {/* 투표 조건 안내 — 조건 달성 시 골드 강조 */}
        <div
          className="mb-4 px-3 py-2 rounded-xl text-center transition-all duration-500"
          style={{
            backgroundColor: conditionMet ? "rgba(251,191,36,0.12)" : "rgba(251,191,36,0.05)",
            border: `1px solid ${conditionMet ? "rgba(251,191,36,0.5)" : "rgba(251,191,36,0.1)"}`,
          }}
        >
          <p
            className="text-xs font-semibold"
            style={{ color: conditionMet ? "rgb(251,191,36)" : "rgba(251,191,36,0.45)" }}
          >
            {conditionMet
              ? "⚡ 정사 전환 조건 달성! 교체 처리 중…"
              : `총 ${TRANSFER_MIN_VOTES}표 이상 · 리믹스 득표율 ${Math.round(TRANSFER_MIN_PCT * 100)}% 이상 시 정사 자동 교체`}
          </p>
        </div>

        {/* 로딩 */}
        {isLoading && (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>집계 불러오는 중…</p>
          </div>
        )}

        {/* ── 상태 A: 로그인 필요 ── */}
        {!isLoading && phase === "no-auth" && (
          <div className="mb-5 p-6 rounded-2xl text-center" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              로그인하면 투표에 참여할 수 있습니다
            </p>
            <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.25)" }}>
              닉네임으로 투표 기록이 저장됩니다
            </p>
            <button
              onClick={(e) => { blockAll(e); onClose(); openAuthModal(); }}
              onPointerDown={blockAll}
              onMouseDown={blockAll}
              className="px-6 py-2.5 rounded-xl text-amber-400 text-sm font-semibold transition-all active:scale-95"
              style={{ backgroundColor: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}
            >
              로그인 / 회원가입
            </button>
          </div>
        )}

        {/* ── 상태 B/C: 로그인 유저 닉네임 + 투표 완료 뱃지 ── */}
        {!isLoading && phase !== "no-auth" && authNickname && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{authNickname} 님</span>
            {phase === "voted" && (
              <span className="text-xs px-2 py-0.5 rounded-full text-amber-400" style={{ backgroundColor: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)", opacity: 0.7 }}>
                투표 완료 ✓
              </span>
            )}
          </div>
        )}

        {/* 참여자 수 */}
        {!isLoading && phase !== "no-auth" && (
          <p className="text-xs text-center mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            {totalVotes > 0 ? `총 ${totalVotes}명 참여` : "아직 투표가 없습니다"}
          </p>
        )}

        {/* ── 투표 카드 (상태 B, C) ── */}
        {!isLoading && phase !== "no-auth" && (
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
