"use client";

import { useState } from "react";
import { Story, Universe } from "@/lib/types";
import { deleteUniverse, calcUniverseScore } from "@/lib/store";

interface Props {
  story: Story;
  currentUniverseIndex: number;
  comments: import("@/lib/types").Comment[];
  onSelect: (index: number) => void;
  onSetMain: (universeId: string) => void;
  onClose: () => void;
  onUniverseDeleted?: () => void;
}

export default function UniversePanel({
  story,
  currentUniverseIndex,
  comments,
  onSelect,
  onSetMain,
  onClose,
  onUniverseDeleted,
}: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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

  // 메인 유니버스 점수
  const mainUniverse = story.universes.find((u) => u.isMain);
  const mainScore = mainUniverse ? calcUniverseScore(mainUniverse, comments) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-lg bg-zinc-950 rounded-t-2xl px-6 pt-6 pb-10 border-t border-white/10 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-4">
          <p className="text-white/40 text-xs tracking-widest">
            유니버스 목록 — {story.universes.length}개
          </p>
          {story.mainHistory && story.mainHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              {showHistory ? "목록 보기" : "⚔ 정사 기록"}
            </button>
          )}
        </div>

        {/* 분기 구조 시각화 — 리믹스가 있을 때만 */}
        {story.universes.some((u) => u.branchFromEpisode !== null) && (
          <div className="mb-4 px-3 py-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-white/20 text-xs mb-2 tracking-widest">분기 구조</p>
            <div className="flex flex-col gap-1.5">
              {story.universes.map((u) => {
                const score = calcUniverseScore(u, comments);
                return (
                  <div key={u.id} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 ${
                      u.branchFromEpisode !== null ? "ml-4" : ""
                    }`}>
                      {u.branchFromEpisode !== null && (
                        <span className="text-white/15 text-xs">└</span>
                      )}
                      <span className={`text-xs ${
                        u.isMain ? "text-white/60 font-medium" : "text-white/30"
                      }`}>
                        {u.label}
                      </span>
                      {u.isMain && (
                        <span className="text-xs text-white/20">(정사)</span>
                      )}
                      {u.branchFromEpisode !== null && (
                        <span className="text-amber-400/40 text-xs">
                          {u.branchFromEpisode + 1}화 →
                        </span>
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
            <p className="text-red-400 text-xs leading-relaxed whitespace-pre-line">
              {errorMsg}
            </p>
          </div>
        )}

        {/* 정사 변경 기록 */}
        {showHistory && story.mainHistory && story.mainHistory.length > 0 && (
          <div className="mb-6">
            <p className="text-white/20 text-xs mb-3">
              이 작품은 {story.mainHistory.length}번 정사가 바뀌었습니다
            </p>
            <div className="flex flex-col gap-2">
              {[...story.mainHistory].reverse().map((h, i) => (
                <div
                  key={i}
                  className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <p className="text-white/60 text-xs">
                    <span className="text-white/30">{h.fromUniverseLabel}</span>
                    <span className="text-white/20 mx-2">→</span>
                    <span className="text-amber-400/80">{h.toUniverseLabel}</span>
                  </p>
                  <p className="text-white/20 text-xs mt-1">
                    {new Date(h.date).toLocaleDateString("ko-KR")} · 👍 {h.totalLikes}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 유니버스 목록 */}
        {!showHistory && (
          <div className="flex flex-col gap-3">
            {story.universes.map((universe: Universe, i: number) => {
              const isCurrentMain = universe.isMain;
              const isSelected = i === currentUniverseIndex;
              const isConfirming = confirmDeleteId === universe.id;
              const score = calcUniverseScore(universe, comments);

              // 도전 상태 계산
              const ratio = mainScore > 0 ? score / mainScore : 0;
              const isChallenger = !isCurrentMain && ratio >= 1.5;
              const isChallenged = isCurrentMain && story.universes.some((u) => {
                if (u.isMain) return false;
                const s = calcUniverseScore(u, comments);
                return mainScore > 0 ? s / mainScore >= 1.5 : false;
              });

              // 진행률 (메인 대비 %)
              const progressPct = mainScore > 0
                ? Math.min((score / mainScore) * 100, 200)
                : 0;

              // 도전 실패 여부
              const challengeFailed =
                !isCurrentMain &&
                universe.challengeStartedAt &&
                (new Date().getTime() - new Date(universe.challengeStartedAt).getTime()) /
                  (1000 * 60 * 60 * 24) > 7;

              return (
                <div
                  key={universe.id}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isChallenger
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
                      <span className="text-white/80 text-sm font-medium">
                        {universe.label}
                      </span>
                      {isCurrentMain && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                          정사
                        </span>
                      )}
                      {isChallenged && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/20 text-red-400/80 border border-red-400/20">
                          ⚔ 도전받는 중
                        </span>
                      )}
                      {isChallenger && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/20">
                          🔥 정사 도전 중
                        </span>
                      )}
                      {challengeFailed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/20">
                          도전 실패
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/70">
                          읽는 중
                        </span>
                      )}
                    </div>
                    <span className="text-white/40 text-xs font-medium">
                      {score}점
                    </span>
                  </div>

                  {/* D-7 카운트다운 */}
                  {!isCurrentMain && universe.challengeStartedAt && !challengeFailed && (
                    (() => {
                      const started = new Date(universe.challengeStartedAt!);
                      const now = new Date();
                      const diffDays = (now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24);
                      const remaining = Math.max(0, Math.ceil(7 - diffDays));
                      return (
                        <div className={`mb-2 flex items-center gap-1.5 ${
                          remaining <= 2 ? "text-red-400/80" : "text-amber-400/60"
                        }`}>
                          <span className="text-xs">⏳</span>
                          <span className="text-xs font-medium">
                            도전 마감 D-{remaining}
                          </span>
                          {remaining <= 2 && (
                            <span className="text-xs text-red-400/60">· 마감 임박</span>
                          )}
                        </div>
                      );
                    })()
                  )}

                  {/* 진행률 바 — 메인이 아닌 유니버스만 */}
                  {!isCurrentMain && mainScore > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/20 text-xs">
                          정사 대비 {Math.round(ratio * 100)}%
                        </span>
                        <span className="text-white/20 text-xs">
                          {ratio >= 2.0 ? "전환 완료" : ratio >= 1.5 ? "전환까지 " + Math.round((2.0 - ratio) * mainScore) + "점" : ""}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            ratio >= 2.0
                              ? "bg-green-400"
                              : ratio >= 1.5
                              ? "bg-amber-400"
                              : "bg-white/30"
                          }`}
                          style={{ width: `${Math.min(progressPct / 2, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 하단 행 */}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-white/30 text-xs flex items-center gap-1.5">
                      <span>{universe.episodes.length}화</span>
                      {universe.branchFromEpisode !== null && (
                        <>
                          <span className="text-white/15">·</span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                            <span className="text-amber-400/60">
                              {universe.branchFromEpisode + 1}화에서 분기
                            </span>
                          </span>
                        </>
                      )}
                    </p>

                    <div className="flex items-center gap-2">
                      {!isCurrentMain && !isConfirming && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetMain(universe.id);
                            onClose();
                          }}
                          className="text-xs text-white/30 hover:text-white/70 transition-colors px-2 py-1 rounded border border-white/10 hover:border-white/30"
                        >
                          정사로 전환
                        </button>
                      )}
                      {!isCurrentMain && !isConfirming && (
                        <button
                          onClick={(e) => handleDeleteClick(e, universe.id)}
                          className="text-xs text-red-400/40 hover:text-red-400/80 transition-colors px-2 py-1 rounded border border-red-400/10 hover:border-red-400/30"
                        >
                          삭제
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
