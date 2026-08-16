import { describe, expect, it } from "vitest";
import { EMAIL_RULE, RateLimiter, clientIp } from "@/lib/rate-limit";

const rule = { limit: 3, windowMs: 1000 };

describe("RateLimiter", () => {
  it("한도까지는 허용하고 그 뒤로 막는다", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i++) {
      expect(limiter.allow("a", rule, 0)).toBe(true);
      limiter.record("a", rule, 0);
    }
    expect(limiter.allow("a", rule, 0)).toBe(false);
  });

  it("윈도우가 지나면 다시 열린다", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i++) limiter.record("a", rule, 0);
    expect(limiter.allow("a", rule, 999)).toBe(false);
    expect(limiter.allow("a", rule, 1001)).toBe(true);
  });

  it("윈도우 안에서만 미끄러진다", () => {
    const limiter = new RateLimiter();
    limiter.record("a", rule, 0);
    limiter.record("a", rule, 600);
    limiter.record("a", rule, 900);
    expect(limiter.allow("a", rule, 999)).toBe(false); // 3건 모두 윈도우 안
    expect(limiter.allow("a", rule, 1000)).toBe(true); // 0ms 건이 윈도우 밖으로
  });

  it("키가 다르면 서로 영향이 없다", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i++) limiter.record("a", rule, 0);
    expect(limiter.allow("b", rule, 0)).toBe(true);
  });

  it("성공하면 실패 기록을 지운다", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i++) limiter.record("a", rule, 0);
    limiter.clear("a");
    expect(limiter.allow("a", rule, 0)).toBe(true);
  });

  it("기본 규칙은 10분에 5회", () => {
    expect(EMAIL_RULE).toEqual({ limit: 5, windowMs: 600_000 });
  });
});

describe("clientIp", () => {
  it("x-forwarded-for의 첫 홉을 쓴다", () => {
    const request = new Request("https://x.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("1.2.3.4");
  });

  it("헤더가 없으면 unknown", () => {
    expect(clientIp(new Request("https://x.test"))).toBe("unknown");
  });
});
