import type { FirebaseApp } from "firebase/app";
import type { Auth, ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import type { FirebaseWebConfig } from "@/lib/firebase-config";

/**
 * Firebase 전화 인증 — 브라우저 전용 로더.
 *
 * SDK를 `await import()`로만 불러온다. 정적으로 import하면 랜딩·설문 첫 로드에
 * 인증 SDK가 통째로 딸려 들어간다 — 실제로 쓰는 건 본인 확인 화면 한 곳뿐이다.
 *
 * 설정(config)은 번들에 박혀 있지 않고 `/api/members/verify`가 명단 대조를
 * 통과한 뒤에 내려준다(`src/lib/firebase-config.ts` 참고).
 */
let app: FirebaseApp | null = null;
let verifier: RecaptchaVerifier | null = null;

/** `010-1234-5678` → `+821012345678`. 서버는 평문 번호를 모른 채로 남는다. */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("82")) return `+${digits}`;
  return `+82${digits.replace(/^0/, "")}`;
}

async function ensureAuth(config: FirebaseWebConfig): Promise<Auth> {
  const [{ getApp, getApps, initializeApp }, { getAuth }] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
  ]);
  if (!app) app = getApps().length > 0 ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  auth.languageCode = "ko"; // 인증 문자를 한국어로 받는다
  return auth;
}

/**
 * 인증번호 발송. reCAPTCHA(invisible)는 **매번 새로 만든다** — 한 번 푼
 * 위젯을 재사용하면 재전송에서 `auth/captcha-check-failed`가 난다.
 */
export async function sendVerificationCode(
  config: FirebaseWebConfig,
  phoneE164: string,
  container: HTMLElement,
): Promise<ConfirmationResult> {
  const auth = await ensureAuth(config);
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
  clearRecaptcha();
  verifier = new RecaptchaVerifier(auth, container, { size: "invisible" });
  return signInWithPhoneNumber(auth, phoneE164, verifier);
}

export function clearRecaptcha(): void {
  try {
    verifier?.clear();
  } catch {
    // 이미 정리된 위젯 — 무시
  }
  verifier = null;
}

/**
 * 인증이 끝나면 브라우저 쪽 로그인 상태를 지운다.
 * (Firebase 사용자 레코드 자체는 그대로 둔다. 학교·공용 PC에 인증 세션이
 * 남지 않게 하는 것이 목적이다.)
 */
export async function signOutQuietly(): Promise<void> {
  try {
    if (!app) return;
    const { getAuth, signOut } = await import("firebase/auth");
    await signOut(getAuth(app));
  } catch {
    // 로그아웃 실패로 학생 흐름을 막지 않는다
  }
}
