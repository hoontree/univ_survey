import { Card } from "@/components/ds/Card";
import { SectionHeading } from "@/components/ds/SectionHeading";

const STEPS = [
  {
    n: 1,
    emoji: "🧭",
    title: "계열 선택",
    desc: "의대 · 약대 · 비메디컬 중 나의 목표 계열을 골라요.",
  },
  {
    n: 2,
    emoji: "🗳️",
    title: "설문 응답",
    desc: "수학 실력과 성향 문항에 솔직하게 답해요. 답변마다 기준을 충족한 대학에 1표씩 쌓여요.",
  },
  {
    n: 3,
    emoji: "🎓",
    title: "추천 확인",
    desc: "가장 많은 표를 받은 대학과 전체 득표 랭킹, 수능최저·시험 일정까지 확인해요.",
  },
];

export function HowItWorks() {
  return (
    <section
      style={{
        padding: "8px 24px 64px",
        maxWidth: "var(--container-page)",
        margin: "0 auto",
      }}
    >
      <SectionHeading title="이렇게 찾아드려요" />
      <div
        style={{
          marginTop: 40,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {STEPS.map((step) => (
          <Card key={step.n}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  display: "flex",
                  width: 32,
                  height: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(99,102,241,.2)",
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  color: "var(--indigo-300)",
                }}
              >
                {step.n}
              </span>
              <span style={{ fontSize: 24 }} aria-hidden>
                {step.emoji}
              </span>
            </div>
            <h3
              style={{
                margin: "16px 0 0",
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-h3)",
                fontWeight: "var(--fw-bold)",
                color: "var(--text-strong)",
              }}
            >
              {step.title}
            </h3>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "var(--text-sm)",
                lineHeight: "var(--leading-relaxed)",
                color: "var(--text-muted)",
              }}
            >
              {step.desc}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
