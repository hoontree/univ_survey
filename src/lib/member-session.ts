import { deriveKey } from "@/lib/secret-keys";
import { signPayload, verifyPayload } from "@/lib/session";

/**
 * 학생 인증 토큰 — 인클래스 명단 대조를 통과했다는 증명.
 *
 * 관리자 세션과 **다른 키**로 서명한다. 같은 키를 쓰면 학생이 자기 토큰을
 * `__session` 쿠키에 넣는 것만으로 `getSessionUser()`가 관리자로 인정해버린다.
 * 키가 다르면 교차 사용이 서명 검증에서 무조건 실패한다 — 잊어버릴 수 있는
 * 플래그가 없다는 게 이 방식의 요점이다.
 *
 * 쿠키가 아니라 sessionStorage + 요청 body로 나르는 이유: 앞단 Firebase
 * Hosting이 `__session` 외의 요청 쿠키를 전부 떼어낸다.
 */
const KEY_LABEL = "member-session/v1";
export const MEMBER_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12시간

interface MemberPayload {
  /** 정규화된 이메일 */
  m: string;
  k: "member";
  exp: number;
}

/** 본인 확인을 통과한 학생에게 발급. 휴대폰번호는 절대 담지 않는다. */
export function signMemberToken(email: string, now: number = Date.now()): string {
  return signPayload(deriveKey(KEY_LABEL), {
    m: email,
    k: "member",
    exp: now + MEMBER_TOKEN_TTL_MS,
  } satisfies MemberPayload);
}

/** 유효하면 이메일, 아니면 null. */
export function verifyMemberToken(
  value: string | undefined | null,
  now: number = Date.now(),
): string | null {
  const data = verifyPayload<MemberPayload>(deriveKey(KEY_LABEL), value, now);
  if (!data || data.k !== "member" || typeof data.m !== "string") return null;
  return data.m;
}
