/**
 * 관리자 토큰 검증. .env.local의 ADMIN_TOKEN과 비교한다.
 * 토큰 미설정 시 관리자 기능 전체 비활성 (실수로 열린 채 배포되는 것 방지).
 */
export function isAdminTokenValid(token: string | null | undefined): true | "미설정" | "불일치" {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return "미설정";
  if (!token || token !== expected) return "불일치";
  return true;
}
