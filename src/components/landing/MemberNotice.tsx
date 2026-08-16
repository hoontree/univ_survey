import { Card } from "@/components/ds/Card";

/** 수강생 전용 이용 안내 — 인클래스 본인 확인 방법과 사용 규칙. */
export function MemberNotice() {
  return (
    <section
      style={{
        padding: "48px 24px 8px",
        maxWidth: "var(--container-result)",
        margin: "0 auto",
      }}
    >
      <Card variant="accent" radius="xl" padding="28px 24px">
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 32 }} aria-hidden>
            🪪
          </span>
          <h2
            style={{
              margin: "12px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-h3)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-strong)",
            }}
          >
            수강생 전용 서비스예요
          </h2>
          <p
            style={{
              margin: "12px auto 0",
              maxWidth: 440,
              fontSize: "var(--text-sm)",
              lineHeight: "var(--leading-relaxed)",
              color: "var(--text-muted)",
            }}
          >
            <strong style={{ color: "var(--text-primary)" }}>인클래스에 등록된 우주설 수업
            수강생</strong>이 이용할 수 있어요. 설문을 시작할 때 인클래스 아이디와 가입할 때 쓴
            휴대폰번호로 본인 확인을 하고,{" "}
            <strong style={{ color: "var(--text-primary)" }}>2회</strong>까지 추천을 받을 수
            있습니다.
          </p>
          <p
            style={{
              margin: "10px auto 0",
              maxWidth: 440,
              fontSize: "var(--text-xs)",
              lineHeight: "var(--leading-relaxed)",
              color: "var(--text-ghost)",
            }}
          >
            입력한 번호는 본인 확인에만 쓰고 그대로 저장하지 않아요. 설문 응답에는 이름·연락처가
            남지 않습니다.
          </p>
        </div>
      </Card>
    </section>
  );
}
