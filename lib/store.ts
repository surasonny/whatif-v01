// lib/store.ts
// What If MVP v0.1 — localStorage 읽기/쓰기 전담 모듈
// hydration mismatch 방지: 이 파일의 함수는 반드시 클라이언트에서만 호출해야 한다.
// (useEffect 안 또는 이벤트 핸들러 안에서만 사용할 것)

import { AppState, Story } from "./types";

// 현재 데이터 버전 — seed가 바뀌면 이 숫자를 올린다
// 버전이 다르면 localStorage를 초기화하고 새 seed를 불러온다
export const CURRENT_DATA_VERSION = 5;

const STORAGE_KEY = "whatif_app_state";

// ─────────────────────────────────────────
// localStorage에서 앱 상태를 읽어온다
// 없거나 버전이 다르면 null을 반환한다
// ─────────────────────────────────────────
export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: AppState = JSON.parse(raw);

    // 버전이 다르면 이전 데이터를 버린다
    if (parsed.dataVersion !== CURRENT_DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    // JSON 파싱 오류 등 예외 발생 시 초기화
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// ─────────────────────────────────────────
// 앱 상태를 localStorage에 저장한다
// ─────────────────────────────────────────
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 실패 시 조용히 무시 (용량 초과 등)
    console.warn("whatif: localStorage 저장 실패");
  }
}

// ─────────────────────────────────────────
// 버전 체크 없이 raw 상태를 읽어온다
// seedIfEmpty 마이그레이션 전용 — 일반 코드에서 사용 금지
// ─────────────────────────────────────────
export function loadStateForMigration(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// localStorage를 완전히 초기화한다
// 개발/디버그용
// ─────────────────────────────────────────
export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─────────────────────────────────────────
// [삭제 1] 특정 유니버스를 삭제한다
//
// 규칙:
// - Main 유니버스(isMain: true)는 삭제 불가
// - 유니버스가 1개뿐이면 삭제 불가 (마지막 유니버스)
// - 삭제 성공 시 true, 실패 시 false 반환
// ─────────────────────────────────────────
export function deleteUniverse(
  storyId: string,
  universeId: string
): { ok: boolean; reason?: string } {
  const state = loadState();
  if (!state) return { ok: false, reason: "상태를 불러올 수 없습니다." };

  const storyIndex = state.stories.findIndex((s) => s.id === storyId);
  if (storyIndex === -1) return { ok: false, reason: "작품을 찾을 수 없습니다." };

  const story = state.stories[storyIndex];
  const universe = story.universes.find((u) => u.id === universeId);

  if (!universe) return { ok: false, reason: "유니버스를 찾을 수 없습니다." };

  if (universe.isMain) {
    return { ok: false, reason: "메인 유니버스는 삭제할 수 없습니다.\n먼저 다른 유니버스를 메인으로 전환해주세요." };
  }

  if (story.universes.length <= 1) {
    return { ok: false, reason: "유니버스가 1개뿐이라 삭제할 수 없습니다." };
  }

  // 해당 유니버스의 댓글도 함께 삭제
  state.comments = state.comments.filter(
    (c) => !(c.storyId === storyId && c.universeId === universeId)
  );

  // 유니버스 제거
  state.stories[storyIndex].universes = story.universes.filter(
    (u) => u.id !== universeId
  );

  saveState(state);
  return { ok: true };
}

// ─────────────────────────────────────────
// [삭제 2] 특정 유니버스의 특정 화를 삭제한다
//
// 규칙:
// - 해당 유니버스에 episode가 1개뿐이면 삭제 불가
// - 삭제 대상 episode의 댓글도 함께 삭제
// ─────────────────────────────────────────
export function deleteEpisode(
  storyId: string,
  universeId: string,
  episodeIndex: number
): { ok: boolean; reason?: string } {
  const state = loadState();
  if (!state) return { ok: false, reason: "상태를 불러올 수 없습니다." };

  const storyIndex = state.stories.findIndex((s) => s.id === storyId);
  if (storyIndex === -1) return { ok: false, reason: "작품을 찾을 수 없습니다." };

  const uIndex = state.stories[storyIndex].universes.findIndex(
    (u) => u.id === universeId
  );
  if (uIndex === -1) return { ok: false, reason: "유니버스를 찾을 수 없습니다." };

  const universe = state.stories[storyIndex].universes[uIndex];

  if (universe.episodes.length <= 1) {
    return { ok: false, reason: "마지막 화는 삭제할 수 없습니다.\n유니버스 전체를 삭제하려면 유니버스 삭제를 이용하세요." };
  }

  const exists = universe.episodes.find((e) => e.index === episodeIndex);
  if (!exists) return { ok: false, reason: "해당 화를 찾을 수 없습니다." };

  // 해당 화의 댓글 삭제
  state.comments = state.comments.filter(
    (c) =>
      !(
        c.storyId === storyId &&
        c.universeId === universeId &&
        c.episodeIndex === episodeIndex
      )
  );

  // 화 제거
  state.stories[storyIndex].universes[uIndex].episodes = universe.episodes.filter(
    (e) => e.index !== episodeIndex
  );

  saveState(state);
  return { ok: true };
}

// ─────────────────────────────────────────
// [삭제 3] 작품 전체를 삭제한다
//
// 규칙:
// - 리믹스 유니버스(isMain: false)가 하나라도 있으면 삭제 불가
//   (리믹스가 있는 작품은 공존해야 한다는 철학)
// - 삭제 성공 시 해당 작품의 댓글도 함께 삭제
// ─────────────────────────────────────────
export function deleteStory(storyId: string): { ok: boolean; reason?: string } {
  const state = loadState();
  if (!state) return { ok: false, reason: "상태를 불러올 수 없습니다." };

  const story = state.stories.find((s) => s.id === storyId);
  if (!story) return { ok: false, reason: "작품을 찾을 수 없습니다." };

  // 리믹스 유니버스가 존재하는지 확인
  const hasRemix = story.universes.some((u) => !u.isMain);
  if (hasRemix) {
    return {
      ok: false,
      reason: "리믹스 유니버스가 존재하는 작품은 삭제할 수 없습니다.\n리믹스 유니버스를 모두 삭제한 뒤 다시 시도해주세요.",
    };
  }

  // 해당 작품의 댓글 전체 삭제
  state.comments = state.comments.filter((c) => c.storyId !== storyId);

  // 작품 제거
  state.stories = state.stories.filter((s) => s.id !== storyId);

  saveState(state);
  return { ok: true };
}

// ─────────────────────────────────────────
// [헬퍼] 특정 작품의 삭제 가능 여부를 미리 확인한다
// UI에서 버튼 비활성화 등에 활용
// ─────────────────────────────────────────
export function canDeleteStory(story: Story): { canDelete: boolean; reason?: string } {
  const hasRemix = story.universes.some((u) => !u.isMain);
  if (hasRemix) {
    return {
      canDelete: false,
      reason: "리믹스 유니버스가 있어 삭제할 수 없습니다.",
    };
  }
  return { canDelete: true };
}