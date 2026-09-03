import { normalizePhone } from "@/lib/members";

/**
 * 개발·검수용 우회 번호 — 강사 본인만 아는 번호 하나로 OTP·횟수 차감을 건너뛰고
 * 설문 전체 흐름을 몇 번이든 돌려보게 하는 뒷문이다.
 *
 * 번호 값은 **소스에 박지 않는다.** 커밋된 번호는 그대로 인증 우회 자격이 되고
 * (PR = 배포라 곧 공개된다), 그것은 AGENTS.md가 금지하는 "OTP를 건너뛰는 폴백"
 * 이다. 대신 서버 전용 env `TEST_BYPASS_PHONE`에서 읽는다 —
 * **env를 설정하지 않으면 이 뒷문은 통째로 존재하지 않는다.** `NEXT_PUBLIC_`이
 * 아니므로 값이 브라우저 번들에 실리지도 않는다.
 *
 * 발급되는 학생 토큰의 이메일은 명단에 절대 없을 이 sentinel이라, 응답 저장
 * 경로가 이 토큰을 알아보고 차감·통계 저장을 건너뛴다.
 */
export const TEST_BYPASS_EMAIL = "__test-bypass__";

/** 설정된 우회 번호(정규화). env가 없거나 형식이 틀리면 null → 뒷문 꺼짐. */
export function testBypassPhone(): string | null {
  return normalizePhone(process.env.TEST_BYPASS_PHONE);
}

/** 입력 번호가 설정된 우회 번호와 같은가. 미설정이면 항상 false. */
export function matchesTestBypass(rawPhone: string | null | undefined): boolean {
  const configured = testBypassPhone();
  if (!configured) return false;
  return normalizePhone(rawPhone) === configured;
}

/** 이 토큰이 우회 토큰인가 — 응답 저장에서 차감을 건너뛸지 판정. */
export function isTestBypassEmail(email: string | null | undefined): boolean {
  return email === TEST_BYPASS_EMAIL;
}
