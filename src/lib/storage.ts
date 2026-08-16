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

/* ── 학생 인증 토큰 (인클래스 본인 확인 통과 증명) ── */

const MEMBER_KEY = "universeol:member";
const grantKey = (track: TrackId) => `universeol:granted:${track}`;

export function loadMemberToken(): string | null {
  try {
    return sessionStorage.getItem(MEMBER_KEY);
  } catch {
    return null;
  }
}

export function saveMemberToken(token: string): void {
  try {
    sessionStorage.setItem(MEMBER_KEY, token);
  } catch {
    // ignore
  }
}

export function clearMemberToken(): void {
  try {
    sessionStorage.removeItem(MEMBER_KEY);
  } catch {
    // ignore
  }
}

/** 결과 발급 성공(사용 횟수 차감 완료) 표시 — 결과 페이지 진입 조건 */
export function saveGrant(track: TrackId): void {
  try {
    sessionStorage.setItem(grantKey(track), "1");
  } catch {
    // ignore
  }
}

export function hasGrant(track: TrackId): boolean {
  try {
    return sessionStorage.getItem(grantKey(track)) === "1";
  } catch {
    return false;
  }
}

export function clearGrant(track: TrackId): void {
  try {
    sessionStorage.removeItem(grantKey(track));
  } catch {
    // ignore
  }
}
