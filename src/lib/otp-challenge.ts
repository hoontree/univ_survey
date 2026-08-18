import { deriveKey } from "@/lib/secret-keys";
import { signPayload, verifyPayload } from "@/lib/session";

/**
 * OTP 챌린지 — "이 아이디는 이 번호로 명단 대조를 통과했다"는 서버의 각서.
 *
 * 1단계(`/api/members/verify`)와 2단계(`/api/members/confirm`) 사이를 잇는다.
 * 서버가 상태를 들고 있지 않아도 되도록 서명 토큰으로 나른다.
 *
 * 담는 건 이메일과 **번호 해시**뿐이다. 평문 번호는 담지도, 응답으로 돌려주지도
 * 않는다 — E.164 변환은 자기가 입력한 값을 아는 브라우저가 한다.
 *
 * 키는 관리자 세션·학생 토큰과 라벨로 갈라 쓴다(`secret-keys.ts`). 챌린지를
 * 학생 토큰 자리에 넣어도 서명 검증에서 무조건 실패해야 한다.
 */
const KEY_LABEL = "otp-challenge/v1";
/** 문자 받고 입력할 시간 — 넉넉하되, 오래 들고 다니지는 못하게 */
export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

interface ChallengePayload {
  /** 정규화된 이메일 */
  m: string;
  /** hashPhone()한 값 */
  p: string;
  k: "otp";
  exp: number;
}

export function signChallenge(email: string, phoneHash: string, now: number = Date.now()): string {
  return signPayload(deriveKey(KEY_LABEL), {
    m: email,
    p: phoneHash,
    k: "otp",
    exp: now + CHALLENGE_TTL_MS,
  } satisfies ChallengePayload);
}

/** 유효하면 {email, phoneHash}, 아니면 null. */
export function verifyChallenge(
  value: string | undefined | null,
  now: number = Date.now(),
): { email: string; phoneHash: string } | null {
  const data = verifyPayload<ChallengePayload>(deriveKey(KEY_LABEL), value, now);
  if (!data || data.k !== "otp") return null;
  if (typeof data.m !== "string" || typeof data.p !== "string") return null;
  return { email: data.m, phoneHash: data.p };
}
