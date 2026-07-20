import type { CSSProperties, ReactNode } from "react";
import { ACCENT_TEXT, type Accent } from "./tokens";

interface EyebrowProps {
  color?: Accent | "muted";
  leadingIcon?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** 헤드라인 위에 앉는 작고 넓게 자간이 벌어진 라벨 — "🪐 우주설의 최종 추천". */
export function Eyebrow({
  color = "brand",
  leadingIcon,
  className,
  style,
  children,
}: EyebrowProps) {
  return (
    <p
      className={className}
      style={{
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--fw-bold)",
        letterSpacing: "var(--tracking-eyebrow)",
        color: color === "muted" ? "var(--text-faint)" : ACCENT_TEXT[color],
        ...style,
      }}
    >
      {leadingIcon && (
        <span aria-hidden style={{ letterSpacing: 0 }}>
          {leadingIcon}
        </span>
      )}
      {children}
    </p>
  );
}
