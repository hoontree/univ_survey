import { beforeAll, describe, expect, it } from "vitest";
import { SESSION_TTL_MS, signSession, verifySession } from "@/lib/session";

beforeAll(() => {
  process.env.ADMIN_TOKEN = "test-signing-secret";
});

describe("세션 서명", () => {
  it("서명한 세션을 다시 검증하면 username", () => {
    const cookie = signSession("teacher");
    expect(verifySession(cookie)).toBe("teacher");
  });

  it("payload를 위조하면 서명 불일치로 거부", () => {
    const cookie = signSession("teacher");
    const sig = cookie.slice(cookie.indexOf(".") + 1);
    const forgedPayload = Buffer.from(
      JSON.stringify({ u: "attacker", exp: Date.now() + SESSION_TTL_MS }),
    ).toString("base64url");
    expect(verifySession(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it("만료된 세션은 거부", () => {
    const longAgo = Date.now() - SESSION_TTL_MS - 60_000;
    const cookie = signSession("teacher", longAgo);
    expect(verifySession(cookie)).toBeNull();
  });

  it("빈 값·형식 오류는 null", () => {
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession("nodot")).toBeNull();
  });
});
