import type { Answers, TrackId } from "@/lib/types";

/** 설문 진행 상태는 sessionStorage에만 저장 (새로고침 대응, 탭 닫으면 초기화) */
const storageKey = (track: TrackId) => `universeol:answers:${track}`;

export function loadAnswers(track: TrackId): Answers | null {
  try {
    const raw = sessionStorage.getItem(storageKey(track));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as Answers;
  } catch {
    return null;
  }
}

export function saveAnswers(track: TrackId, answers: Answers): void {
  try {
    sessionStorage.setItem(storageKey(track), JSON.stringify(answers));
  } catch {
    // 스토리지 불가 환경(시크릿 모드 등)에서도 설문 진행은 가능해야 함
  }
}

export function clearAnswers(track: TrackId): void {
  try {
    sessionStorage.removeItem(storageKey(track));
  } catch {
    // ignore
  }
}
