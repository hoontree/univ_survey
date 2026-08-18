import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { type PublicKeys, parseMaxAgeMs, verifyIdToken } from "@/lib/firebase-id-token";

const PROJECT = "universeol";
const NOW = 1_700_000_000_000;
const MAX_AUTH_AGE_MS = 10 * 60 * 1000;

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });

const KEYS: PublicKeys = { k1: publicKey };

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** 구글이 발급한 것처럼 생긴 토큰을 만든다 */
function makeToken(
  overrides: {
    header?: Record<string, unknown>;
    payload?: Record<string, unknown>;
    signWith?: crypto.KeyObject;
  } = {},
): string {
  const seconds = Math.floor(NOW / 1000);
  const header = { alg: "RS256", kid: "k1", typ: "JWT", ...overrides.header };
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    sub: "uid-1",
    iat: seconds - 30,
    exp: seconds + 3600,
    auth_time: seconds - 30,
    phone_number: "+821012345678",
    firebase: { sign_in_provider: "phone" },
    ...overrides.payload,
  };
  const signed = `${b64(header)}.${b64(payload)}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signed), overrides.signWith ?? privateKey)
    .toString("base64url");
  return `${signed}.${signature}`;
}

const verify = (token: string, now: number = NOW) =>
  verifyIdToken(KEYS, token, { projectId: PROJECT, now, maxAuthAgeMs: MAX_AUTH_AGE_MS });

describe("verifyIdToken", () => {
  it("정상 토큰에서 uid와 번호를 꺼낸다", () => {
    expect(verify(makeToken())).toEqual({ ok: true, uid: "uid-1", phoneNumber: "+821012345678" });
  });

  it("형식이 아니면 거부", () => {
    expect(verify("나눌.수.없.음")).toEqual({ ok: false, reason: "malformed" });
    expect(verify("한조각")).toEqual({ ok: false, reason: "malformed" });
    expect(verify("aaa.bbb.ccc")).toEqual({ ok: false, reason: "malformed" });
  });

  it("alg=none이나 HMAC으로 바꿔치기한 토큰을 거부한다", () => {
    const header = b64({ alg: "none", kid: "k1" });
    const payload = b64({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT });
    expect(verify(`${header}.${payload}.`)).toEqual({ ok: false, reason: "alg" });
    expect(verify(makeToken({ header: { alg: "HS256" } }))).toEqual({ ok: false, reason: "alg" });
  });

  it("모르는 kid는 거부", () => {
    expect(verify(makeToken({ header: { kid: "없는키" } }))).toEqual({ ok: false, reason: "kid" });
    expect(verify(makeToken({ header: { kid: 1 } }))).toEqual({ ok: false, reason: "kid" });
  });

  it("다른 키로 서명했거나 본문을 손댄 토큰을 거부한다", () => {
    expect(verify(makeToken({ signWith: other.privateKey }))).toEqual({
      ok: false,
      reason: "signature",
    });

    // 서명은 그대로 두고 payload의 번호만 바꿔치기
    const [header, , signature] = makeToken().split(".");
    const tampered = b64({ phone_number: "+821099999999" });
    expect(verify(`${header}.${tampered}.${signature}`)).toEqual({
      ok: false,
      reason: "signature",
    });
  });

  it("만료됐거나 미래에 발급된 토큰을 거부한다", () => {
    expect(verify(makeToken(), NOW + 2 * 3600 * 1000)).toEqual({ ok: false, reason: "expired" });
    expect(verify(makeToken(), NOW - 2 * 3600 * 1000)).toEqual({ ok: false, reason: "expired" });
  });

  it("다른 프로젝트에서 온 토큰을 거부한다", () => {
    expect(verify(makeToken({ payload: { iss: "https://securetoken.google.com/남의프로젝트" } }))).toEqual(
      { ok: false, reason: "issuer" },
    );
    expect(verify(makeToken({ payload: { aud: "남의프로젝트" } }))).toEqual({
      ok: false,
      reason: "audience",
    });
  });

  it("전화 로그인이 아니면 거부한다", () => {
    expect(verify(makeToken({ payload: { firebase: { sign_in_provider: "anonymous" } } }))).toEqual({
      ok: false,
      reason: "provider",
    });
    expect(verify(makeToken({ payload: { firebase: {} } }))).toEqual({ ok: false, reason: "provider" });
  });

  it("번호나 uid가 없으면 거부한다", () => {
    expect(verify(makeToken({ payload: { phone_number: "" } }))).toEqual({ ok: false, reason: "phone" });
    expect(verify(makeToken({ payload: { sub: "" } }))).toEqual({ ok: false, reason: "subject" });
  });

  it("로그인한 지 오래된 토큰을 거부한다 — 예전 인증 재사용 차단", () => {
    const stale = makeToken({ payload: { auth_time: Math.floor(NOW / 1000) - 20 * 60 } });
    expect(verify(stale)).toEqual({ ok: false, reason: "stale" });

    const fresh = makeToken({ payload: { auth_time: Math.floor(NOW / 1000) - 5 * 60 } });
    expect(verify(fresh).ok).toBe(true);
  });
});

describe("parseMaxAgeMs", () => {
  it("max-age를 읽고, 없거나 이상하면 하한·상한으로 자른다", () => {
    expect(parseMaxAgeMs("public, max-age=3600, must-revalidate")).toBe(3_600_000);
    expect(parseMaxAgeMs(null)).toBe(60_000);
    expect(parseMaxAgeMs("no-cache")).toBe(60_000);
    expect(parseMaxAgeMs("max-age=1")).toBe(60_000);
    expect(parseMaxAgeMs("max-age=999999999")).toBe(86_400_000);
  });
});
