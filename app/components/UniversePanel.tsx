"use client";

import { useState } from "react";
import { Story, Universe } from "@/lib/types";
import { deleteUniverse } from "@/lib/store";

interface Props {
  story: Story;
  currentUniverseIndex: number;
  onSelect: (index: number) => void;
  onSetMain: (universeId: string) => void;
  onClose: () => void;
  onUniverseDeleted?: () => void;
}

export default function UniversePanel({
  story,
  currentUniverseIndex,
  onSelect,
  onSetMain,
  onClose,
  onUniverseDeleted,
}: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-lg bg-zinc-950 rounded-t-2xl px-6 pt-6 pb-10 border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
        <p className="text-white/40 text-xs tracking-widest mb-4">
          유니버스 목록 — {story.universes.length}개
        </p>

        {errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-xs leading-relaxed whitespace-pre-line">
              {errorMsg}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {story.universes.map((universe: Universe, i: number) => {
            const isCurrentMain = universe.isMain;
            const isSelected = i === currentUniverseIndex;
            const isConfirming = confirmDeleteId === universe.id;
            const totalLikes = universe.episodes.reduce(
              (sum, ep) => sum + ep.likes,
              0
            );

            return (
              <div
                key={universe.id}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 bg-white/5 hover:bg-white/8"
                }`}
                onClick={() => {
                  if (isConfirming) return;
                  onSelect(i);
                  onClose();
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white/80 text-sm font-medium">
                      {universe.label}
                    </span>
                    {isCurrentMain && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                        정사
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/70">
                        읽는 중
                      </span>
                    )}
                  </div>
                  <span className="text-white/30 text-xs">👍 {totalLikes}</span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-white/30 text-xs">
                    {universe.episodes.length}화
                    {universe.branchFromEpisode !== null &&
                      ` · ${universe.branchFromEpisode + 1}화에서 분기`}
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
                        <span className="text-xs text-white/40">정말 삭제할까요?</span>
                        <button
                          onClick={(e) => handleDeleteConfirm(e, universe.id)}
                          className="text-xs text-red-400 px-2 py-1 rounded border border-red-400/40 hover:bg-red-400/10 transition-colors"
                        >
                          삭제
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          className="text-xs text-white/40 px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors"
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
      </div>
    </div>
  );
}
