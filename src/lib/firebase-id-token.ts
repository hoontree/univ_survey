import crypto from "node:crypto";

/**
 * Firebase ID 토큰(전화 로그인) 검증 — 외부 의존성 없이.
 *
 * `firebase-admin`을 넣지 않는 이유: 필요한 건 RS256 JWT 검증 하나뿐인데
 * Admin SDK는 standalone 런타임 번들을 크게 불린다. 같은 판단으로 이 저장소는
 * xlsx 파서도 직접 썼다(`src/lib/xlsx.ts`).
 *
 * **여기가 뚫리면 명단에 없는 사람이 설문에 들어온다.** 그래서 네트워크(공개키
 * 내려받기)와 판정(순수 함수)을 갈라 두고, 판정 쪽만 테스트로 조인다.
 */
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

/** 서버·구글 사이 시계 오차 허용치 */
const CLOCK_SKEW_MS = 60 * 1000;
/** 공개키 캐시 하한·상한 — 응답의 max-age가 이상해도 폭주하지 않게 */
const MIN_CACHE_MS = 60 * 1000;
const MAX_CACHE_MS = 24 * 60 * 60 * 1000;

export type PublicKeys = Record<string, crypto.KeyObject>;

export type IdTokenFailure =
  | "malformed"
  | "alg"
  | "kid"
  | "signature"
  | "expired"
  | "issuer"
  | "audience"
  | "subject"
  | "provider"
  | "phone"
  | "stale";

export type IdTokenCheck =
  | { ok: true; uid: string; phoneNumber: string }
  | { ok: false; reason: IdTokenFailure };

export interface VerifyOptions {
  projectId: string;
  now: number;
  /** 로그인(auth_time)이 이보다 오래됐으면 거부 — 예전 토큰 재사용 차단 */
  maxAuthAgeMs: number;
}

interface JwtHeader {
  alg?: unknown;
  kid?: unknown;
}

interface JwtPayload {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  auth_time?: unknown;
  phone_number?: unknown;
  firebase?: { sign_in_provider?: unknown };
}

function decodeSegment(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

/**
 * ID 토큰 판정 — 순수 함수. `keys`는 kid → 공개키.
 *
 * 검사 순서는 싼 것부터(형식 → 알고리즘 → 서명 → 클레임). 서명을 확인하기
 * 전에는 payload의 어떤 값도 신뢰하지 않는다.
 */
export function verifyIdToken(
  keys: PublicKeys,
  token: string,
  { projectId, now, maxAuthAgeMs }: VerifyOptions,
): IdTokenCheck {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [rawHeader, rawPayload, rawSignature] = parts;

  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    header = decodeSegment(rawHeader) as JwtHeader;
    payload = decodeSegment(rawPayload) as JwtPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!header || typeof header !== "object" || !payload || typeof payload !== "object") {
    return { ok: false, reason: "malformed" };
  }

  // alg를 화이트리스트로 고정한다 — `none`이나 HMAC으로 갈아끼우는 알고리즘
  // 혼동 공격은 여기서 끝난다
  if (header.alg !== "RS256") return { ok: false, reason: "alg" };
  if (typeof header.kid !== "string") return { ok: false, reason: "kid" };
  const key = keys[header.kid];
  if (!key) return { ok: false, reason: "kid" };

  const signature = Buffer.from(rawSignature, "base64url");
  const signed = Buffer.from(`${rawHeader}.${rawPayload}`);
  let valid = false;
  try {
    valid = crypto.verify("RSA-SHA256", signed, key, signature);
  } catch {
    return { ok: false, reason: "signature" };
  }
  if (!valid) return { ok: false, reason: "signature" };

  /* ── 여기부터는 payload를 믿어도 된다 ── */

  const seconds = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value * 1000 : null;

  const exp = seconds(payload.exp);
  const iat = seconds(payload.iat);
  if (exp === null || iat === null) return { ok: false, reason: "malformed" };
  if (exp <= now - CLOCK_SKEW_MS) return { ok: false, reason: "expired" };
  if (iat > now + CLOCK_SKEW_MS) return { ok: false, reason: "expired" };

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    return { ok: false, reason: "issuer" };
  }
  // aud가 우리 프로젝트인지 봐야 한다. 다른 Firebase 프로젝트에서 받은
  // 멀쩡한 토큰이 여기서 통하면 안 된다
  if (payload.aud !== projectId) return { ok: false, reason: "audience" };
  if (typeof payload.sub !== "string" || !payload.sub) return { ok: false, reason: "subject" };
  if (payload.firebase?.sign_in_provider !== "phone") return { ok: false, reason: "provider" };
  if (typeof payload.phone_number !== "string" || !payload.phone_number) {
    return { ok: false, reason: "phone" };
  }

  const authTime = seconds(payload.auth_time);
  if (authTime === null) return { ok: false, reason: "stale" };
  if (authTime > now + CLOCK_SKEW_MS) return { ok: false, reason: "stale" };
  if (now - authTime > maxAuthAgeMs) return { ok: false, reason: "stale" };

  return { ok: true, uid: payload.sub, phoneNumber: payload.phone_number };
}

/** `Cache-Control: ..., max-age=3600, ...` → 3600000ms */
export function parseMaxAgeMs(header: string | null): number {
  const match = /max-age\s*=\s*(\d+)/i.exec(header ?? "");
  if (!match) return MIN_CACHE_MS;
  return Math.min(MAX_CACHE_MS, Math.max(MIN_CACHE_MS, Number(match[1]) * 1000));
}

/** x509 인증서 PEM 맵 → 공개키 맵 */
export function keysFromCerts(certs: Record<string, string>): PublicKeys {
  const keys: PublicKeys = {};
  for (const [kid, pem] of Object.entries(certs)) {
    try {
      keys[kid] = new crypto.X509Certificate(pem).publicKey;
    } catch {
      // 못 읽는 인증서는 건너뛴다 — 나머지 키로 검증은 계속 가능하다
    }
  }
  return keys;
}

let cache: { keys: PublicKeys; expiresAt: number } | null = null;

/** 구글 공개키 — 응답의 max-age만큼 프로세스 안에 캐시한다 */
export async function fetchSecureTokenKeys(now: number = Date.now()): Promise<PublicKeys> {
  if (cache && cache.expiresAt > now) return cache.keys;

  const res = await fetch(CERTS_URL);
  if (!res.ok) {
    // 갱신에 실패해도 만료된 캐시가 있으면 그걸로 버틴다 — 구글 쪽 일시적
    // 장애 때문에 학생이 설문에 못 들어가는 게 더 나쁘다
    if (cache) return cache.keys;
    throw new Error(`Firebase 공개키를 가져오지 못했습니다 (${res.status})`);
  }
  const keys = keysFromCerts((await res.json()) as Record<string, string>);
  cache = { keys, expiresAt: now + parseMaxAgeMs(res.headers.get("cache-control")) };
  return keys;
}
