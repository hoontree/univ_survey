import { cookies } from "next/headers";
import { isAdminTokenValid } from "@/lib/admin";
import { signSession, verifySession, SESSION_TTL_MS } from "@/lib/session";
import { NextResponse } from "next/server";

/**
 * 쿠키 이름이 `__session`인 이유: 앞단 Firebase Hosting은 CDN 캐시를 위해
 * 백엔드(Cloud Run)로 넘기는 요청에서 `__session` 외의 쿠키를 떼어낸다.
 * 다른 이름을 쓰면 로그인은 되는데 그 뒤 요청에 세션이 실려오지 않는다.
 */
export const SESSION_COOKIE = "__session";
const MAX_AGE_SEC = Math.floor(SESSION_TTL_MS / 1000);

/** 로그인한 관리자 아이디 (세션 쿠키 기준). 없으면 null. */
export async function getSessionUser(): Promise<string | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/**
 * API 인증 — 브라우저는 세션 쿠키, 프로그래매틱/CLI는 Bearer ADMIN_TOKEN.
 * 인증되면 식별자, 아니면 null.
 */
export async function requireApiAdmin(request: Request): Promise<string | null> {
  const user = await getSessionUser();
  if (user) return user;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (isAdminTokenValid(bearer) === true) return "(token)";
  return null;
}

/** 응답에 세션 쿠키를 심는다. */
export function attachSession<T extends NextResponse>(res: T, username: string): T {
  res.cookies.set(SESSION_COOKIE, signSession(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return res;
}

export function clearSession<T extends NextResponse>(res: T): T {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
