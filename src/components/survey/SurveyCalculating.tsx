import { type Accent, GLOW, GRADIENT } from "@/components/ds/tokens";

interface SurveyCalculatingProps {
  /** 0–100 현재 진행률 */
  progress: number;
  /** 이 스텝까지 채우는 데 걸리는 전환 시간(ms) — 스텝마다 달라 멈칫대는 느낌을 준다 */
  moveMs: number;
  /** 현재 내부 처리 단계 문구 */
  label: string;
  track: Accent;
}

/**
 * 마지막 문항 제출 후 결과 발급 전, 채점 로직이 돌아가는 듯한 계산 화면.
 * 진행 바는 스텝 단위로 움직였다 멈췄다 하며 약 4초에 걸쳐 100%에 도달한다.
 */
export function SurveyCalculating({ progress, moveMs, label, track }: SurveyCalculatingProps) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <div
      className="univ-question-enter"
      style={{
        marginTop: 56,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-h3)",
          fontWeight: "var(--fw-bold)",
          lineHeight: "var(--leading-snug)",
          color: "var(--text-strong)",
        }}
      >
        결과를 계산하고 있어요
      </h1>

      <p
        aria-live="polite"
        style={{
          margin: "16px 0 0",
          minHeight: "1.5em",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "var(--text-body)",
          color: "var(--text-muted)",
        }}
      >
        <span
          className="univ-calc-dot"
          style={{
            width: 8,
            height: 8,
            borderRadius: "var(--radius-full)",
            backgroundImage: GRADIENT[track],
          }}
        />
        {label}
      </p>

      <div style={{ width: "100%", maxWidth: 360, marginTop: 40 }}>
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            height: 8,
            width: "100%",
            borderRadius: "var(--radius-full)",
            background: "var(--w-10)",
            overflow: "hidden",
            boxShadow: GLOW[track],
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: "var(--radius-full)",
              backgroundImage: GRADIENT[track],
              transition: `width ${moveMs}ms var(--ease-out)`,
            }}
          />
        </div>
        <p
          style={{
            margin: "12px 0 0",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-body)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-accent)",
          }}
        >
          {Math.round(pct)}%
        </p>
      </div>
    </div>
  );
}
