import { beforeAll, describe, expect, it } from "vitest";
import {
  MEMBER_TOKEN_TTL_MS,
  signMemberToken,
  verifyMemberToken,
} from "@/lib/member-session";
import { signSession, verifySession } from "@/lib/session";

describe("학생 인증 토큰", () => {
  beforeAll(() => {
    process.env.ADMIN_TOKEN = "test-secret-key";
  });

  it("서명한 토큰에서 이메일을 되찾는다", () => {
    const token = signMemberToken("abcd1234@inclass.co.kr");
    expect(verifyMemberToken(token)).toBe("abcd1234@inclass.co.kr");
  });

  it("만료되면 null", () => {
    const now = Date.now();
    const token = signMemberToken("abcd1234@inclass.co.kr", now);
    expect(verifyMemberToken(token, now + MEMBER_TOKEN_TTL_MS - 1)).toBe(
      "abcd1234@inclass.co.kr",
    );
    expect(verifyMemberToken(token, now + MEMBER_TOKEN_TTL_MS + 1)).toBeNull();
  });

  it("위조·형식 오류는 null", () => {
    const token = signMemberToken("abcd1234@inclass.co.kr");
    const [payload] = token.split(".");
    expect(verifyMemberToken(`${payload}.deadbeef`)).toBeNull();
    expect(verifyMemberToken("서명없음")).toBeNull();
    expect(verifyMemberToken("")).toBeNull();
    expect(verifyMemberToken(null)).toBeNull();
  });

  /**
   * 이 저장소에서 가장 중요한 회귀 테스트.
   * 관리자 세션과 학생 토큰이 같은 키로 서명되면, 학생이 자기 토큰을
   * `__session` 쿠키에 넣는 것만으로 관리자 권한을 얻는다.
   */
  it("학생 토큰은 관리자 세션으로 통하지 않는다", () => {
    const memberToken = signMemberToken("abcd1234@inclass.co.kr");
    expect(verifySession(memberToken)).toBeNull();
  });

  it("관리자 세션은 학생 토큰으로 통하지 않는다", () => {
    const adminSession = signSession("teacher");
    expect(verifyMemberToken(adminSession)).toBeNull();
  });

  it("ADMIN_TOKEN이 바뀌면 기존 토큰은 무효", () => {
    const token = signMemberToken("abcd1234@inclass.co.kr");
    process.env.ADMIN_TOKEN = "rotated-secret";
    expect(verifyMemberToken(token)).toBeNull();
    process.env.ADMIN_TOKEN = "test-secret-key";
  });
});
