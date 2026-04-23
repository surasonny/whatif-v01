"use client";

import { useState } from "react";
import { Story, Universe } from "@/lib/types";
import { deleteUniverse, calcUniverseScore } from "@/lib/store";
import LikeFloating from "./LikeFloating";

const CHALLENGE_THRESHOLD = 1.5;
const TRANSFER_THRESHOLD = 2.0;

interface Props {
  story: Story;
  currentUniverseIndex: number;
  comments: import("@/lib/types").Comment[];
  onSelect: (index: number) => void;
  onSetMain: (universeId: string) => void;
  onClose: () => void;
  onUniverseDeleted?: () => void;
  onCanonTransferred?: (fromLabel: string, toLabel: string) => void;
  onShowVote?: (universeId: string) => void;
  onLike?: (universeId: string) => void;
  votes?: import("@/lib/types").Vote[];
  voterNickname?: string;
}

export default function UniversePanel({
  story,
  currentUniverseIndex,
  comments,
  onSelect,
  onSetMain,
  onClose,
  onUniverseDeleted,
  onCanonTransferred,
  onShowVote,
  onLike,
  votes,
  voterNickname,
}: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [likeFloats, setLikeFloats] = useState<{ id: number; x: number; y: number }[]>([]);

  function handleDeleteClick(e: React.MouseEvent, universeId: string) {
    e.stopPropagation();
    setErrorMsg(null);
    setConfirmDeleteId(universeId);
  }

  function handleDeleteConfirm(e: React.MouseEvent, universeId: string) {
    e.stopPropagation();
    const result = deleteUniverse(story.id, universeId);
    if (!result.ok) {
      setErrorMsg(result.reason ?? "삭제할 수 없습니다.");
      setConfirmDeleteId(null);
      return;
    }
    setConfirmDeleteId(null);
    onUniverseDeleted?.();
    onClose();
  }

  function handleDeleteCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setErrorMsg(null);
  }

  function addFloat(x: number, y: number) {
    const id = Date.now();
    setLikeFloats((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setLikeFloats((prev) => prev.filter((f) => f.id !== id)), 1100);
  }

  const mainUniverse = story.universes.find((u) => u.isMain);
  const mainScore = Math.round(mainUniverse ? calcUniverseScore(mainUniverse, comments) : 0);
  const mainRawLikes = mainUniverse
    ? mainUniverse.episodes.reduce((s, e) => s + (Number(e.likes) || 0), 0)
    : 0;

  const hasVoted = !!(votes?.some(
    (v) => v.storyId === story.id && v.voter === (voterNickname ?? "")
  ));

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div
          className="relative w-full max-w-lg bg-zinc-950 rounded-t-2xl px-6 pt-6 pb-10 border-t border-white/10 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-white/40 text-xs tracking-widest">
                유니버스 목록 — {story.universes.length}개
              </p>
              {story.mainHistory && story.mainHistory.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400/70">
                  {story.mainHistory.length + 1}대 정사
                </span>
              )}
            </div>
            {story.mainHistory && story.mainHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-white/30 text-xs hover:text-white/60 transition-colors"
              >
                {showHistory ? "목록 보기" : "⚔ 정사 기록"}
              </button>
            )}
          </div>

          {/* 분기 구조 시각화 */}
          {story.universes.some((u) => u.branchFromEpisode !== null) && (
            <div className="mb-4 px-3 py-3 rounded-xl bg-white/3 border border-white/5">
              <p className="text-white/20 text-xs mb-2 tracking-widest">분기 구조</p>
              <div className="flex flex-col gap-1.5">
                {story.universes.map((u) => {
                  const score = Math.round(calcUniverseScore(u, comments));
                  return (
                    <div key={u.id} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 ${u.branchFromEpisode !== null ? "ml-4" : ""}`}>
                        {u.branchFromEpisode !== null && (
                          <span className="text-white/15 text-xs">└</span>
                        )}
                        <span className={`text-xs ${u.isMain ? "text-white/60 font-medium" : "text-white/30"}`}>
                          {u.label}
                        </span>
                        {u.isMain && <span className="text-xs text-white/20">(정사)</span>}
                        {u.branchFromEpisode !== null && (
                          <span className="text-amber-400/40 text-xs">{u.branchFromEpisode + 1}화 →</span>
                        )}
                      </div>
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-white/20 text-xs">{score}점</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-xs leading-relaxed whitespace-pre-line">{errorMsg}</p>
            </div>
          )}

          {/* 정사 변경 기록 */}
          {showHistory && story.mainHistory && story.mainHistory.length > 0 && (
            <div className="mb-6">
              <p className="text-white/20 text-xs mb-3">
                이 작품은 {story.mainHistory.length}번 정사가 바뀌었습니다
              </p>
              <div className="flex flex-col gap-2">
                {[...story.mainHistory].reverse().map((h, i) => {
                  const generation = story.mainHistory!.length - i + 1;
                  return (
                    <div key={i} className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white/60 text-xs">
                          <span className="text-white/30">{h.fromUniverseLabel}</span>
                          <span className="text-white/20 mx-2">→</span>
                          <span className="text-amber-400/80">{h.toUniverseLabel}</span>
                        </p>
                        <span className="text-amber-400/50 text-xs">{generation}대 정사</span>
                      </div>
                      <p className="text-white/20 text-xs">
                        {new Date(h.date).toLocaleDateString("ko-KR")} · 👍 {h.totalLikes}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 유니버스 목록 */}
          {!showHistory && (
            <div className="flex flex-col gap-3">
              {/* VS 대결 블록 */}
              {(() => {
                const challenger = story.universes.find((u) => {
                  if (u.isMain) return false;
                  const s = Math.round(calcUniverseScore(u, comments));
                  const mScore = Math.round(calcUniverseScore(
                    story.universes.find((m) => m.isMain) ?? story.universes[0],
                    comments
                  ));
                  return s > 0 || mScore > 0;
                });
                if (!challenger) return null;
                const challengerScore = Math.round(calcUniverseScore(challenger, comments));
                const isWinning = challengerScore > mainScore;
                return (
                  <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-white/3 to-amber-400/5 border border-amber-400/20">
                    <p className="text-amber-400/60 text-xs mb-3 tracking-widest">⚔ 정사대전</p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 text-center">
                        <p className="text-white/50 text-xs mb-1">정사</p>
                        <p className="text-white font-bold text-sm">{mainUniverse?.label}</p>
                        <p className={`text-lg font-black mt-1 ${isWinning ? "text-white/40" : "text-white"}`}>
                          {mainScore}점
                        </p>
                      </div>
                      <div className="text-amber-400 text-xl font-black">VS</div>
                      <div className="flex-1 text-center">
                        <p className="text-amber-400/60 text-xs mb-1">도전자</p>
                        <p className="text-amber-400 font-bold text-sm">{challenger.label}</p>
                        <p className={`text-lg font-black mt-1 ${isWinning ? "text-amber-400" : "text-white/40"}`}>
                          {challengerScore}점
                        </p>
                      </div>
                    </div>
                    <p className="text-center text-xs mt-2 text-white/30">
                      {isWinning ? "🔥 도전자 우세" : "✓ 정사 우세"}
                    </p>
                  </div>
                );
              })()}

              {/* 유니버스 카드들 */}
              {story.universes.map((universe: Universe, i: number) => {
                const isCurrentMain = universe.isMain;
                const isSelected = i === currentUniverseIndex;
                const isConfirming = confirmDeleteId === universe.id;
                const score = Math.round(calcUniverseScore(universe, comments));

                // raw likes 기반 비율 계산
                const rawLikes = universe.episodes.reduce((s, e) => s + (Number(e.likes) || 0), 0);
                const rawRatio = !isCurrentMain && mainRawLikes > 0 ? rawLikes / mainRawLikes : 0;
                const isChallenger150 = !isCurrentMain && rawRatio >= CHALLENGE_THRESHOLD;
                const isChallenger200 = !isCurrentMain && rawRatio >= TRANSFER_THRESHOLD;

                // 진행률 바 (raw likes 기준, 200% = 100%)
                const progressPct = !isCurrentMain && mainRawLikes > 0
                  ? Math.min((rawLikes / (mainRawLikes * TRANSFER_THRESHOLD)) * 100, 100)
                  : 0;

                // score 기반 비율 (표시용)
                const ratio = mainScore > 0 ? score / mainScore : 0;
                const isChallenged = isCurrentMain && story.universes.some((u) => {
                  if (u.isMain) return false;
                  const s = calcUniverseScore(u, comments);
                  return mainScore > 0 ? s / mainScore >= 1.5 : false;
                });

                const challengeFailed =
                  !isCurrentMain &&
                  universe.challengeStartedAt &&
                  (new Date().getTime() - new Date(universe.challengeStartedAt).getTime()) /
                    (1000 * 60 * 60 * 24) > 7;

                // 디버그: 비(非)정사 카드마다 두 비율 모두 출력
                if (!isCurrentMain) {
                  console.log(
                    `[UniversePanel] "${universe.label}" — rawLikes: ${rawLikes}, mainRawLikes: ${mainRawLikes}, rawRatio: ${rawRatio.toFixed(2)} (${Math.round(rawRatio * 100)}%) | scoreRatio: ${ratio.toFixed(2)} (${Math.round(ratio * 100)}%) | isChallenger150: ${isChallenger150}`
                  );
                }

                return (
                  <div
                    key={universe.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isChallenger200
                        ? "border-red-400/40 bg-red-400/5"
                        : isChallenger150
                        ? "border-amber-400/40 bg-amber-400/5"
                        : isSelected
                        ? "border-white/40 bg-white/10"
                        : "border-white/10 bg-white/5"
                    }`}
                    onClick={() => {
                      if (isConfirming) return;
                      onSelect(i);
                      onClose();
                    }}
                  >
                    {/* 상단 행 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/80 text-sm font-medium">{universe.label}</span>
                        {isCurrentMain && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">정사</span>
                        )}
                        {isChallenged && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/20 text-red-400/80 border border-red-400/20">
                            ⚔ 도전받는 중
                          </span>
                        )}
                        {isChallenger200 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/20 text-red-400 border border-red-400/30 animate-pulse">
                            ⚔️ 정사 전환 가능
                          </span>
                        )}
                        {isChallenger150 && !isChallenger200 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/20 animate-pulse">
                            🔥 정사 도전 중
                          </span>
                        )}
                        {challengeFailed && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/20">도전 실패</span>
                        )}
                        {isSelected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/70">읽는 중</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-bold ${
                          isChallenger200 ? "text-red-400" : isChallenger150 ? "text-amber-400" : isCurrentMain ? "text-white/70" : "text-white/40"
                        }`}>
                          {score}점
                        </span>
                        {!isCurrentMain && mainScore > 0 && (
                          <span className={`text-xs ${
                            ratio >= 1.5 ? "text-red-400/70" : ratio >= 1.0 ? "text-amber-400/60" : "text-white/20"
                          }`}>
                            점수 {Math.round(ratio * 100)}%
                          </span>
                        )}
                        {!isCurrentMain && mainRawLikes > 0 && (
                          <span className={`text-xs ${
                            rawRatio >= TRANSFER_THRESHOLD ? "text-red-400/70" : rawRatio >= CHALLENGE_THRESHOLD ? "text-amber-400/60" : "text-white/20"
                          }`}>
                            좋아요 {Math.round(rawRatio * 100)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* D-7 카운트다운 */}
                    {!isCurrentMain && universe.challengeStartedAt && !challengeFailed && (
                      (() => {
                        const started = new Date(universe.challengeStartedAt!);
                        const now = new Date();
                        const diffDays = (now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24);
                        const remaining = Math.max(0, Math.ceil(7 - diffDays));
                        return (
                          <div className={`mb-2 flex items-center gap-1.5 ${remaining <= 2 ? "text-red-400/80" : "text-amber-400/60"}`}>
                            <span className="text-xs">⏳</span>
                            <span className="text-xs font-medium">도전 마감 D-{remaining}</span>
                            {remaining <= 2 && <span className="text-xs text-red-400/60">· 마감 임박</span>}
                          </div>
                        );
                      })()
                    )}

                    {/* 진행률 바 — raw likes 기준 */}
                    {!isCurrentMain && mainRawLikes > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/20 text-xs">
                            좋아요 {Math.round(rawRatio * 100)}%
                          </span>
                          <span className="text-white/20 text-xs">
                            {rawRatio >= TRANSFER_THRESHOLD
                              ? "전환 가능"
                              : rawRatio >= CHALLENGE_THRESHOLD
                              ? `전환까지 ${Math.round((TRANSFER_THRESHOLD - rawRatio) * mainRawLikes)}좋아요`
                              : ""}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              rawRatio >= TRANSFER_THRESHOLD
                                ? "bg-red-400 animate-pulse"
                                : rawRatio >= CHALLENGE_THRESHOLD
                                ? "bg-amber-400 animate-pulse"
                                : "bg-green-400/60"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 하단 행 — 액션 버튼 */}
                    <div className="flex flex-col gap-2 mt-1">
                      <p className="text-white/30 text-xs flex items-center gap-1.5">
                        <span>{universe.episodes.length}화</span>
                        {universe.branchFromEpisode !== null && (
                          <>
                            <span className="text-white/15">·</span>
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                              <span className="text-amber-400/60">{universe.branchFromEpisode + 1}화에서 분기</span>
                            </span>
                          </>
                        )}
                      </p>

                      {!isCurrentMain && !isConfirming && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const mainU = story.universes.find((u) => u.isMain);
                              if (mainU) onCanonTransferred?.(mainU.label, universe.label);
                              onSetMain(universe.id);
                              onClose();
                            }}
                            className="text-xs text-white/30 hover:text-white/70 transition-colors px-2 py-1 rounded border border-white/10 hover:border-white/30"
                          >
                            정사로 전환
                          </button>
                          {onLike && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLike(universe.id);
                                addFloat(e.clientX, e.clientY);
                              }}
                              className="text-xs text-white/30 hover:text-orange-400/70 transition-colors px-2 py-1 rounded border border-white/10 hover:border-orange-400/30"
                            >
                              👍 응원
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteClick(e, universe.id)}
                            className="text-xs text-red-400/40 hover:text-red-400/80 transition-colors px-2 py-1 rounded border border-red-400/10 hover:border-red-400/30"
                          >
                            삭제
                          </button>
                        </div>
                      )}

                      {/* 투표 버튼 — 비(非)정사 카드에 무조건 표시 (디버그용) */}
                      {!isCurrentMain && onShowVote && !isConfirming && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("[UniversePanel] 투표 버튼 클릭 — universeId:", universe.id, "rawRatio:", rawRatio.toFixed(2), "scoreRatio:", ratio.toFixed(2));
                            onShowVote(universe.id);
                          }}
                          className={`w-full py-2.5 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${
                            hasVoted
                              ? "text-white/50 border-white/20 bg-white/5 hover:bg-white/8"
                              : "text-amber-400 border-amber-400/50 bg-amber-400/8 hover:bg-amber-400/15 animate-pulse"
                          }`}
                        >
                          {hasVoted ? "📊 투표 현황 보기" : "⚔️ 독자 투표 참여하기"}
                        </button>
                      )}

                      {isConfirming && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/40">정말 삭제?</span>
                          <button
                            onClick={(e) => handleDeleteConfirm(e, universe.id)}
                            className="text-xs text-red-400 px-2 py-1 rounded border border-red-400/40 hover:bg-red-400/10"
                          >
                            삭제
                          </button>
                          <button
                            onClick={handleDeleteCancel}
                            className="text-xs text-white/40 px-2 py-1 rounded border border-white/10"
                          >
                            취소
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {likeFloats.map((f) => (
        <LikeFloating key={f.id} x={f.x} y={f.y} id={f.id} />
      ))}
    </>
  );
}
