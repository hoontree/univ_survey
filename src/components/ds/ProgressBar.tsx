import type { CSSProperties } from "react";
import { type Accent, GRADIENT, cx } from "./tokens";

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  track?: Accent | "muted";
  height?: number;
  /** 마운트 시 채움 애니메이션 재생 (결과 득표 바) */
  animated?: boolean;
  /** 비승자 행처럼 흐리게 */
  dim?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** 얇은 라운드 트랙 + 그라디언트 필. 설문 진행·득표 바·관리자 분포에 공통. */
export function ProgressBar({
  value,
  track = "brand",
  height = 6,
  animated = false,
  dim = false,
  className,
  style,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = track === "muted" ? "var(--w-40)" : GRADIENT[track];
  return (
    <div
      className={className}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        height,
        width: "100%",
        borderRadius: "var(--radius-full)",
        background: "var(--w-10)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        className={cx(animated && "univ-bar-fill")}
        style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: "var(--radius-full)",
          backgroundImage: fill,
          opacity: dim ? 0.4 : 1,
          transition: "width var(--dur-base) var(--ease-out)",
        }}
      />
    </div>
  );
}
