import { ProgressBar } from "./ProgressBar";
import type { Accent } from "./tokens";

interface StatBarProps {
  label: string;
  count: number;
  max: number;
  track?: Accent | "muted";
  labelWidth?: string;
  height?: number;
}

/** 라벨 + 채움 바 + 카운트. 관리자 1위 분포와 문항별 답변 분포에 사용. */
export function StatBar({
  label,
  count,
  max,
  track = "nonmedical",
  labelWidth = "10rem",
  height = 8,
}: StatBarProps) {
  const pct = max === 0 ? 0 : (count / max) * 100;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontSize: "var(--text-xs)",
      }}
    >
      <span
        style={{
          flex: `0 0 ${labelWidth}`,
          width: labelWidth,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1 }}>
        <ProgressBar value={pct} track={track} height={height} />
      </div>
      <span
        style={{
          flex: "0 0 auto",
          width: "2rem",
          textAlign: "right",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-muted)",
        }}
      >
        {count}
      </span>
    </div>
  );
}
