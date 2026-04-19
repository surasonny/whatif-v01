"use client";

import { useState, useRef } from "react";

interface Props {
  onUpload: (url: string) => void;
  currentImageUrl?: string;
}

export default function ImageUploader({ onUpload, currentImageUrl }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

      {/* 업로드 버튼 */}
      {!currentImageUrl && (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:border-white/40 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-white/40 text-xs">업로드 중...</p>
            </>
          ) : (
            <>
              <span className="text-2xl">🖼️</span>
              <p className="text-white/40 text-xs">이미지 업로드</p>
              <p className="text-white/20 text-xs">5MB 이하 JPG, PNG</p>
            </>
          )}
        </button>
      )}

      {currentImageUrl && !uploading && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full mt-1 py-2 text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          이미지 변경
        </button>
      )}

      {error && (
        <p className="text-red-400/70 text-xs mt-2">{error}</p>
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