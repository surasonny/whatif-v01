"use client";

import { useState, useRef } from "react";

interface Props {
  onUpload: (url: string) => void;
  currentImageUrl?: string;
  // AI 생성용 컨텍스트 (선택)
  storyTitle?: string;
  genre?: string;
  episodeTitle?: string;
  content?: string;
}

export default function ImageUploader({
  onUpload,
  currentImageUrl,
  storyTitle,
  genre,
  episodeTitle,
  content,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 수동 업로드
  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("5MB 이하 이미지만 업로드 가능합니다.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      onUpload(data.url);
    } catch (e: any) {
      setError(e.message || "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  // AI 자동 생성
  const handleGenerate = async () => {
    setGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: storyTitle ?? "제목 없음",
          genre: genre ?? "일반",
          episodeTitle: episodeTitle ?? "",
          content: content ?? "",
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      onUpload(data.url);

      if (data.temporary) {
        setError("⚠️ 임시 이미지입니다. 1시간 후 만료됩니다.");
      }
    } catch (e: any) {
      setError(e.message || "이미지 생성 실패");
    } finally {
      setGenerating(false);
    }
  };

  const isLoading = uploading || generating;

  return (
    <div className="w-full">
      {/* 현재 이미지 미리보기 */}
      {currentImageUrl && (
        <div className="relative w-full h-48 mb-3 rounded-xl overflow-hidden">
          <img
            src={currentImageUrl}
            alt="커버 이미지"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <button
              onClick={() => inputRef.current?.click()}
              className="text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-full"
            >
              이미지 변경
            </button>
          </div>
        </div>
      )}

      {/* 업로드/생성 버튼 영역 */}
      {!currentImageUrl && (
        <div className="flex flex-col gap-2">
          {/* AI 생성 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full h-16 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center gap-3 hover:bg-white/10 hover:border-white/40 transition-all disabled:opacity-50"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-white/60 text-sm">웹툰 이미지 생성 중...</span>
              </>
            ) : (
              <>
                <span className="text-xl">✦</span>
                <div className="text-left">
                  <p className="text-white/70 text-sm font-medium">AI 웹툰 이미지 생성</p>
                  <p className="text-white/30 text-xs">글 내용을 바탕으로 자동 생성</p>
                </div>
              </>
            )}
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/20 text-xs">또는</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* 수동 업로드 버튼 */}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
            className="w-full h-12 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 hover:border-white/30 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-white/40 text-xs">업로드 중...</span>
              </>
            ) : (
              <>
                <span className="text-base">🖼️</span>
                <span className="text-white/30 text-xs">직접 업로드</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 이미지 있을 때 하단 버튼들 */}
      {currentImageUrl && !isLoading && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex-1 py-2 text-white/30 text-xs hover:text-white/60 transition-colors border border-white/10 rounded-lg hover:border-white/20 disabled:opacity-50"
          >
            ✦ AI 재생성
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex-1 py-2 text-white/30 text-xs hover:text-white/60 transition-colors border border-white/10 rounded-lg hover:border-white/20"
          >
            🖼️ 직접 변경
          </button>
        </div>
      )}

      {/* 에러/경고 메시지 */}
      {error && (
        <p className="text-yellow-400/70 text-xs mt-2">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
