import { ProgressBar } from "./ProgressBar";
import type { Accent } from "./tokens";

interface QuestionProgressProps {
  /** 1-based */
  index: number;
  total: number;
  track: Accent;
}

/** 설문 헤더 진행 표시 — "문항 N / total"과 퍼센트, 그 아래 트랙 색 진행 바. */
export function QuestionProgress({ index, total, track }: QuestionProgressProps) {
  const pct = Math.round((index / total) * 100);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-muted)",
        }}
      >
        <span>
          문항{" "}
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-body)",
              color: "var(--text-accent)",
            }}
          >
            {index}
          </span>{" "}
          / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <ProgressBar value={pct} track={track} style={{ marginTop: "0.5rem" }} />
    </div>
  );
}
