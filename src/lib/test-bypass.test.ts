import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TEST_BYPASS_EMAIL, isTestBypassEmail, matchesTestBypass, testBypassPhone } from "@/lib/test-bypass";

describe("개발·검수용 우회 번호", () => {
  const original = process.env.TEST_BYPASS_PHONE;
  beforeEach(() => {
    delete process.env.TEST_BYPASS_PHONE;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.TEST_BYPASS_PHONE;
    else process.env.TEST_BYPASS_PHONE = original;
  });

  it("env가 없으면 뒷문은 통째로 꺼져 있다", () => {
    expect(testBypassPhone()).toBeNull();
    expect(matchesTestBypass("01047453206")).toBe(false);
    // 빈 문자열/undefined 입력에도 절대 통과하지 않는다
    expect(matchesTestBypass("")).toBe(false);
    expect(matchesTestBypass(null)).toBe(false);
  });

  it("설정된 번호와 일치하면 통과한다", () => {
    process.env.TEST_BYPASS_PHONE = "01047453206";
    expect(matchesTestBypass("01047453206")).toBe(true);
  });

  it("표기가 달라도 정규화 후 같으면 통과한다", () => {
    process.env.TEST_BYPASS_PHONE = "010-4745-3206";
    expect(matchesTestBypass("+82 10 4745 3206")).toBe(true);
    expect(matchesTestBypass("01047453206")).toBe(true);
  });

  it("다른 번호는 통과하지 못한다", () => {
    process.env.TEST_BYPASS_PHONE = "01047453206";
    expect(matchesTestBypass("01012345678")).toBe(false);
  });

  it("env 형식이 틀리면 꺼진 것으로 본다", () => {
    process.env.TEST_BYPASS_PHONE = "not-a-phone";
    expect(testBypassPhone()).toBeNull();
    expect(matchesTestBypass("not-a-phone")).toBe(false);
  });

  it("sentinel 이메일만 우회 토큰으로 인정한다", () => {
    expect(isTestBypassEmail(TEST_BYPASS_EMAIL)).toBe(true);
    expect(isTestBypassEmail("abcd1234@inclass.co.kr")).toBe(false);
    expect(isTestBypassEmail(null)).toBe(false);
  });
});
