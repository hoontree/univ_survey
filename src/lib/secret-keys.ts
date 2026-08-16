import crypto from "node:crypto";

/**
 * ADMIN_TOKEN 하나에서 용도별 키를 갈라 쓴다(도메인 분리).
 *
 * 시크릿을 더 만들지 않는 이유: 새 시크릿은 Secret Manager 엔트리·IAM·
 * cloudbuild 수정이 필요하고, "시크릿이 아직 없으면 배포가 깨진다"는
 * 닭-달걀이 생긴다. 62명짜리 명단에는 과하다.
 *
 * 대신 **키를 절대 raw로 쓰지 않는다.** 용도가 다른 두 곳이 같은 키를 쓰면
 * 한쪽의 서명이 다른 쪽에서 통해버린다(학생 토큰 → 관리자 세션).
 */
export function deriveKey(label: string): Buffer {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) throw new Error("ADMIN_TOKEN(서명 키)이 설정되지 않았습니다");
  return crypto.createHmac("sha256", secret).update(label).digest();
}

/**
 * 현재 ADMIN_TOKEN의 지문. 명단 문서에 함께 저장해 두면, 시크릿이 교체돼
 * 저장된 번호 해시가 전부 무효가 됐을 때 그 사실을 알아챌 수 있다.
 * (지문이 없으면 "갑자기 아무도 로그인이 안 된다"로만 보인다.)
 */
export function keyFingerprint(): string {
  return deriveKey("fp/v1").toString("hex").slice(0, 8);
}
