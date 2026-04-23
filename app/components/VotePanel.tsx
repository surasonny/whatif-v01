"use client";

import { Story, Vote } from "@/lib/types";

interface Props {
  story: Story;
  comments: import("@/lib/types").Comment[];
  votes: Vote[];
  voterNickname: string;
  onVote: (universeId: string) => void;
  onClose: () => void;
}

export default function VotePanel({
  story,
  votes,
  voterNickname,
  onVote,
  onClose,
}: Props) {
  const mainUniverse = story.universes.find((u) => u.isMain);

  const myVote = votes.find(
    (v) => v.storyId === story.id && v.voter === voterNickname
  );

  const getVoteCount = (universeId: string) =>
    votes.filter((v) => v.storyId === story.id && v.universeId === universeId).length;

  const totalVotes = votes.filter((v) => v.storyId === story.id).length;

  // raw likes 기준 150% 이상인 도전자들
  const mainLikesTotal = mainUniverse
    ? mainUniverse.episodes.reduce((s, e) => s + (Number(e.likes) || 0), 0)
    : 0;
  const challengers = story.universes.filter((u) => {
    if (u.isMain) return false;
    const uLikes = u.episodes.reduce((s, e) => s + (Number(e.likes) || 0), 0);
    return mainLikesTotal > 0 && uLikes / mainLikesTotal >= 1.5;
  });

  if (challengers.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative w-full max-w-lg bg-zinc-950 rounded-t-2xl px-6 pt-6 pb-10 border-t border-amber-400/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-amber-400/20 rounded-full mx-auto mb-6" />

        <div className="text-center mb-6">
          <p className="text-amber-400 font-black text-lg mb-1">⚔ 독자 투표</p>
          <p className="text-white/40 text-xs">
            150% 조건 달성 — 독자가 새 정사를 결정합니다
          </p>
          <p className="text-white/20 text-xs mt-1">총 {totalVotes}명 참여</p>
        </div>

        <div className="flex flex-col gap-3">
          {mainUniverse && (
            <div
              onClick={() => !myVote && onVote(mainUniverse.id)}
              className={`p-4 rounded-xl border transition-all ${
                myVote?.universeId === mainUniverse.id
                  ? "border-white/40 bg-white/10"
                  : myVote
                  ? "border-white/5 bg-white/3 opacity-50"
                  : "border-white/20 bg-white/5 hover:border-white/40 cursor-pointer"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white/70 text-sm font-medium">{mainUniverse.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40">현재 정사</span>
                  {myVote?.universeId === mainUniverse.id && (
                    <span className="text-xs text-white/60">✓ 내 선택</span>
                  )}
                </div>
                <span className="text-white/40 text-xs">{getVoteCount(mainUniverse.id)}표</span>
              </div>
              {totalVotes > 0 && (
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/40 rounded-full transition-all"
                    style={{ width: `${(getVoteCount(mainUniverse.id) / totalVotes) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {challengers.map((u) => {
            const voteCount = getVoteCount(u.id);
            const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
            return (
              <div
                key={u.id}
                onClick={() => !myVote && onVote(u.id)}
                className={`p-4 rounded-xl border transition-all ${
                  myVote?.universeId === u.id
                    ? "border-amber-400/60 bg-amber-400/10"
                    : myVote
                    ? "border-amber-400/10 bg-amber-400/3 opacity-50"
                    : "border-amber-400/20 bg-amber-400/5 hover:border-amber-400/40 cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400/80 text-sm font-medium">{u.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400/60">도전자</span>
                    {myVote?.universeId === u.id && (
                      <span className="text-xs text-amber-400/60">✓ 내 선택</span>
                    )}
                  </div>
                  <span className="text-amber-400/40 text-xs">{voteCount}표</span>
                </div>
                {totalVotes > 0 && (
                  <div className="w-full h-1.5 bg-amber-400/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400/50 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {myVote && (
          <p className="text-center text-white/20 text-xs mt-4">이미 투표하셨습니다</p>
        )}
        {!myVote && !voterNickname && (
          <p className="text-center text-white/20 text-xs mt-4">닉네임을 설정하면 투표할 수 있습니다</p>
        )}
      </div>
    </div>
  );
}
