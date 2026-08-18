/**
 * Firebase 웹 SDK 설정 — 서버 env에서 조립한다.
 *
 * `NEXT_PUBLIC_`으로 빌드에 박지 않는 이유: 이 값들이 정적 번들에 들어가면
 * 랜딩만 열어도 누구나 전화 인증 SDK를 초기화할 수 있다. 대신 명단 대조를
 * 통과한 응답(`/api/members/verify`)에만 실어 보내 **문자 발송의 문턱을**
 * 명단 뒤로 옮긴다. (config는 결국 브라우저에 도달하므로 완전한 차단은
 * 아니다 — 나머지는 SMS 지역 정책(KR)과 Firebase 자체 스로틀이 맡는다.)
 *
 * 웹 apiKey는 시크릿이 아니다(공개돼도 되는 프로젝트 식별자). Secret Manager가
 * 아니라 평범한 환경변수로 두는 이유다.
 */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export function firebaseProjectId(): string | null {
  return process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT ?? null;
}

/**
 * 하나라도 비어 있으면 null. 호출부는 이때 **문을 닫아야 한다** —
 * 설정이 빠졌다고 OTP를 건너뛰고 통과시키면 설정 실수가 곧 인증 우회가 된다.
 */
export function firebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = process.env.FIREBASE_API_KEY;
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN;
  const appId = process.env.FIREBASE_WEB_APP_ID;
  const projectId = firebaseProjectId();
  if (!apiKey || !authDomain || !appId || !projectId) return null;
  return { apiKey, authDomain, projectId, appId };
}
