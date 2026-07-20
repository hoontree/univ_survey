import crypto from "node:crypto";

/**
 * 관리자 세션 토큰 — HMAC-SHA256 서명 쿠키.
 * 서명 키는 기존 ADMIN_TOKEN 시크릿을 재사용한다(별도 시크릿 불필요).
 * 값 형식: `<base64url payload>.<base64url sig>`, payload = { u, exp }.
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

function secret(): string | null {
  return process.env.ADMIN_TOKEN ?? null;
}

/** 세션 쿠키 값 생성. ADMIN_TOKEN 미설정 시 예외(세션 발급 불가). */
export function signSession(username: string, now: number = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_TOKEN(세션 서명 키)이 설정되지 않았습니다");
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: now + SESSION_TTL_MS }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** 유효하면 username, 아니면 null. 위조·만료·미설정 모두 null. */
export function verifySession(
  value: string | undefined | null,
  now: number = Date.now(),
): string | null {
  try {
    const key = secret();
    if (!key || !value) return null;
    const dot = value.indexOf(".");
    if (dot < 0) return null;
    const payload = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    const expected = crypto.createHmac("sha256", key).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.u !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < now) return null;
    return data.u;
  } catch {
    return null;
  }
}
