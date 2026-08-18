import { deriveKey } from "@/lib/secret-keys";
import { signPayload, verifyPayload } from "@/lib/session";

/**
 * OTP 챌린지 — "이 번호는 명단 대조를 통과했다"는 서버의 각서.
 *
 * 1단계(`/api/members/verify`)와 2단계(`/api/members/confirm`) 사이를 잇는다.
 * 서버가 상태를 들고 있지 않아도 되도록 서명 토큰으로 나른다.
 *
 * 담는 건 **번호 해시**와, 정해졌다면 구성원 이메일이다. 평문 번호는 담지도,
 * 응답으로 돌려주지도 않는다 — E.164 변환은 자기가 입력한 값을 아는 브라우저가
 * 한다.
 *
 * `email`이 비어 있는 챌린지는 "번호는 맞지만 누구인지 아직 모른다"는 뜻이다.
 * 한 번호에 형제자매가 걸린 경우, 문자 인증을 마친 뒤 이름을 고르면 그 사람으로
 * 확정된 챌린지를 새로 발급한다.
 *
 * 키는 관리자 세션·학생 토큰과 라벨로 갈라 쓴다(`secret-keys.ts`). 챌린지를
 * 학생 토큰 자리에 넣어도 서명 검증에서 무조건 실패해야 한다.
 */
const KEY_LABEL = "otp-challenge/v1";
/** 문자 받고 입력할 시간 — 넉넉하되, 오래 들고 다니지는 못하게 */
export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

interface ChallengePayload {
  /** hashPhone()한 값 */
  p: string;
  /** 정규화된 이메일. 아직 특정되지 않았으면 빈 문자열 */
  m: string;
  k: "otp";
  exp: number;
}

export function signChallenge(
  phoneHash: string,
  email: string | null = null,
  now: number = Date.now(),
): string {
  return signPayload(deriveKey(KEY_LABEL), {
    p: phoneHash,
    m: email ?? "",
    k: "otp",
    exp: now + CHALLENGE_TTL_MS,
  } satisfies ChallengePayload);
}

/** 유효하면 {phoneHash, email}, 아니면 null. `email`은 미확정이면 null. */
export function verifyChallenge(
  value: string | undefined | null,
  now: number = Date.now(),
): { phoneHash: string; email: string | null } | null {
  const data = verifyPayload<ChallengePayload>(deriveKey(KEY_LABEL), value, now);
  if (!data || data.k !== "otp") return null;
  if (typeof data.p !== "string" || !data.p || typeof data.m !== "string") return null;
  return { phoneHash: data.p, email: data.m || null };
}
