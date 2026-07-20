import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  formatCode,
  isValidCodeFormat,
  normalizeCode,
} from "@/lib/tokens";

describe("토큰 코드 형식", () => {
  it("알파벳에 혼동 문자(0/O/1/I/L)가 없다", () => {
    for (const ch of "0O1IL") {
      expect(CODE_ALPHABET).not.toContain(ch);
    }
  });

  it("normalizeCode: 하이픈·공백·소문자 입력을 저장 형식으로", () => {
    expect(normalizeCode("abcd-efgh")).toBe("ABCDEFGH");
    expect(normalizeCode("  AB CD 23 45 ")).toBe("ABCD2345");
    expect(normalizeCode("ab-cd_23!45")).toBe("ABCD2345");
  });

  it("isValidCodeFormat: 길이·문자셋 검사", () => {
    expect(isValidCodeFormat("ABCD2345")).toBe(true);
    expect(isValidCodeFormat("ABCD234")).toBe(false); // 7자
    expect(isValidCodeFormat("ABCD23456")).toBe(false); // 9자
    expect(isValidCodeFormat("ABCD234O")).toBe(false); // 혼동 문자 O
    expect(isValidCodeFormat("ABCD2341")).toBe(false); // 혼동 문자 1
    expect(isValidCodeFormat("")).toBe(false);
  });

  it("formatCode: XXXX-XXXX 표시 형식", () => {
    expect(formatCode("ABCD2345")).toBe("ABCD-2345");
  });

  it("표시 형식을 다시 정규화하면 원래 코드", () => {
    const code = "WXYZ7892";
    expect(normalizeCode(formatCode(code))).toBe(code);
    expect(isValidCodeFormat(normalizeCode(formatCode(code)))).toBe(true);
  });
});
