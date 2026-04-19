"use client";

import { Story, Universe } from "@/lib/types";

interface Props {
  story: Story;
  currentUniverseIndex: number;
  onSelect: (index: number) => void;
  onSetMain: (universeId: string) => void;
  onClose: () => void;
}

export default function UniversePanel({
  story,
  currentUniverseIndex,
  onSelect,
  onSetMain,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/70" />

      {/* 패널 */}
      <div
        className="relative w-full max-w-lg bg-zinc-950 rounded-t-2xl px-6 pt-6 pb-10 border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        <p className="text-white/40 text-xs tracking-widest mb-4">
          유니버스 목록 — {story.universes.length}개
        </p>

        <div className="flex flex-col gap-3">
          {story.universes.map((universe: Universe, i: number) => {
            const isCurrentMain = universe.isMain;
            const isSelected = i === currentUniverseIndex;
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
                  <span className="text-white/30 text-xs">
                    👍 {totalLikes}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-white/30 text-xs">
                    {universe.episodes.length}화
                    {universe.branchFromEpisode !== null &&
                      ` · ${universe.branchFromEpisode + 1}화에서 분기`}
                  </p>

                  {/* 메인 전환 버튼 — 현재 정사가 아닌 경우에만 표시 */}
                  {!isCurrentMain && (
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
