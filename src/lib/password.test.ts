import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("비밀번호 해시", () => {
  it("올바른 비밀번호는 통과", () => {
    const stored = hashPassword("teacher-pass-1");
    expect(verifyPassword("teacher-pass-1", stored)).toBe(true);
  });

  it("틀린 비밀번호는 실패", () => {
    const stored = hashPassword("teacher-pass-1");
    expect(verifyPassword("wrong-pass", stored)).toBe(false);
  });

  it("같은 비밀번호도 매번 다른 salt로 해시", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("형식이 깨진 저장값은 실패", () => {
    expect(verifyPassword("x", "garbage")).toBe(false);
    expect(verifyPassword("x", "scrypt$onlyonepart")).toBe(false);
  });
});
