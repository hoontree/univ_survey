import { Card } from "@/components/ds/Card";

/** 수강생 전용 이용 안내 — 토큰 발급 방법과 사용 규칙. */
export function TokenNotice() {
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
            🎟️
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
            이용 토큰은 <strong style={{ color: "var(--text-primary)" }}>우주설 선생님 수업을
            듣는 학생</strong>에게만 발급됩니다. 토큰 1개로{" "}
            <strong style={{ color: "var(--text-primary)" }}>2회</strong>까지 추천을 받을 수
            있어요. 발급은 수업에서 안내됩니다.
          </p>
        </div>
      </Card>
    </section>
  );
}
