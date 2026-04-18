// lib/store.ts
// What If MVP v0.1 — localStorage 읽기/쓰기 전담 모듈
// hydration mismatch 방지: 이 파일의 함수는 반드시 클라이언트에서만 호출해야 한다.
// (useEffect 안 또는 이벤트 핸들러 안에서만 사용할 것)

import { AppState } from "./types";

// 현재 데이터 버전 — seed가 바뀌면 이 숫자를 올린다
// 버전이 다르면 localStorage를 초기화하고 새 seed를 불러온다
export const CURRENT_DATA_VERSION = 1;

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
// localStorage를 완전히 초기화한다
// 개발/디버그용
// ─────────────────────────────────────────
export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
