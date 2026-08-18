import { beforeAll, describe, expect, it } from "vitest";
import { signMemberToken, verifyMemberToken } from "@/lib/member-session";
import { CHALLENGE_TTL_MS, signChallenge, verifyChallenge } from "@/lib/otp-challenge";
import { signSession, verifySession } from "@/lib/session";

const EMAIL = "abcd1234@inclass.co.kr";
const HASH = "a".repeat(64);

describe("OTP 챌린지", () => {
  beforeAll(() => {
    process.env.ADMIN_TOKEN = "test-secret-key";
  });

  it("번호 해시만 담은 챌린지 — 아직 누구인지 모르는 상태", () => {
    expect(verifyChallenge(signChallenge(HASH))).toEqual({ phoneHash: HASH, email: null });
  });

  it("구성원이 확정되면 이메일까지 담는다", () => {
    expect(verifyChallenge(signChallenge(HASH, EMAIL))).toEqual({
      phoneHash: HASH,
      email: EMAIL,
    });
  });

  it("10분이 지나면 null", () => {
    const now = Date.now();
    const challenge = signChallenge(HASH, EMAIL, now);
    expect(verifyChallenge(challenge, now + CHALLENGE_TTL_MS - 1)).not.toBeNull();
    expect(verifyChallenge(challenge, now + CHALLENGE_TTL_MS + 1)).toBeNull();
  });

  it("위조·형식 오류는 null", () => {
    const [payload] = signChallenge(HASH).split(".");
    expect(verifyChallenge(`${payload}.deadbeef`)).toBeNull();
    expect(verifyChallenge("서명없음")).toBeNull();
    expect(verifyChallenge("")).toBeNull();
    expect(verifyChallenge(null)).toBeNull();
  });

  /**
   * 챌린지는 "번호 확인 전"에 나가는 반쪽짜리 증명이다. 이게 학생 토큰으로
   * 통하면 문자를 받지 않고도 설문에 들어갈 수 있다.
   */
  it("챌린지는 학생 토큰·관리자 세션으로 통하지 않는다", () => {
    const challenge = signChallenge(HASH, EMAIL);
    expect(verifyMemberToken(challenge)).toBeNull();
    expect(verifySession(challenge)).toBeNull();
  });

  it("학생 토큰·관리자 세션도 챌린지로 통하지 않는다", () => {
    expect(verifyChallenge(signMemberToken(EMAIL))).toBeNull();
    expect(verifyChallenge(signSession("teacher"))).toBeNull();
  });
});
