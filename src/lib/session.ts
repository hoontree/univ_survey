import crypto from "node:crypto";

/**
 * 관리자 세션 토큰 — HMAC-SHA256 서명 쿠키.
 * 서명 키는 기존 ADMIN_TOKEN 시크릿을 재사용한다(별도 시크릿 불필요).
 * 값 형식: `<base64url payload>.<base64url sig>`, payload = { u, exp }.
 *
 * 서명·검증 프리미티브(signPayload/verifyPayload)는 학생 인증 토큰
 * (`member-session.ts`)과 공유하되 **키는 절대 공유하지 않는다** — 같은 키를
 * 쓰면 학생 토큰을 `__session` 쿠키에 넣는 것만으로 관리자가 된다.
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

/** 만료(exp)를 담은 payload를 서명한다. */
export function signPayload(key: crypto.BinaryLike, data: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto.createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** 서명·만료가 모두 유효하면 payload, 아니면 null. */
export function verifyPayload<T extends { exp: number }>(
  key: crypto.BinaryLike,
  value: string | undefined | null,
  now: number,
): T | null {
  try {
    if (!value) return null;
    const dot = value.indexOf(".");
    if (dot < 0) return null;
    const payload = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    const expected = crypto.createHmac("sha256", key).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data?.exp !== "number" || data.exp < now) return null;
    return data as T;
  } catch {
    return null;
  }
}

function secret(): string | null {
  return process.env.ADMIN_TOKEN ?? null;
}

/** 세션 쿠키 값 생성. ADMIN_TOKEN 미설정 시 예외(세션 발급 불가). */
export function signSession(username: string, now: number = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_TOKEN(세션 서명 키)이 설정되지 않았습니다");
  return signPayload(key, { u: username, exp: now + SESSION_TTL_MS });
}

/** 유효하면 username, 아니면 null. 위조·만료·미설정 모두 null. */
export function verifySession(
  value: string | undefined | null,
  now: number = Date.now(),
): string | null {
  const key = secret();
  if (!key) return null;
  const data = verifyPayload<{ u: unknown; exp: number }>(key, value, now);
  return typeof data?.u === "string" ? data.u : null;
}
