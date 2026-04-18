"use client";

import { useRef, useState } from "react";
import { Story, Universe, Episode } from "@/lib/types";

interface Props {
  story: Story;
  universe: Universe;
  episode: Episode;
  onClose: () => void;
}

export default function SnapshotCard({ story, universe, episode, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `whatif-${story.id}-${episode.index + 1}화.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("스냅샷 저장 실패", e);
    }
    setSaving(false);
  };

  // 본문 앞부분 발췌 (최대 120자)
  const excerpt = episode.content.slice(0, 120).trim() + "...";

  return (
    // 전체 오버레이
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 카드 본체 — 이 영역이 PNG로 저장됨 */}
        <div
          ref={cardRef}
          style={{
            width: 360,
            minHeight: 560,
            backgroundColor: story.coverColor,
            borderRadius: 24,
            padding: 36,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* 배경 그라디언트 오버레이 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7))",
              borderRadius: 24,
            }}
          />

          {/* 상단 — 로고 + 유니버스 */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 32,
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "-0.5px",
                }}
              >
                What If
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 11,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                {universe.label}
              </span>
            </div>

            {/* 장르 */}
            <span
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              {story.genre}
            </span>
          </div>

          {/* 중단 — 본문 발췌 */}
          <div style={{ position: "relative", zIndex: 1, flex: 1, paddingTop: 24, paddingBottom: 24 }}>
            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 14,
                lineHeight: 1.9,
                fontStyle: "italic",
              }}
            >
              "{excerpt}"
            </p>
          </div>

          {/* 하단 — 제목 + 화 정보 + 작가 */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              {episode.title}
            </p>
            <h2
              style={{
                color: "#ffffff",
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: 8,
                letterSpacing: "-0.5px",
              }}
            >
              {story.title}
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 12,
              }}
            >
              by {story.author}
            </p>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full border border-white/20 text-white/50 text-sm hover:text-white hover:border-white/50 transition-all"
          >
            닫기
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "저장 중..." : "📥 이미지로 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}