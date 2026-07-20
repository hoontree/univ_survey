import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { type Accent, GRADIENT, cx } from "./tokens";

interface CardProps {
  variant?: "resting" | "accent";
  radius?: "lg" | "xl";
  interactive?: boolean;
  /** 상단 3px 트랙 그라디언트 바 */
  accentBar?: Accent;
  href?: string;
  padding?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * 기본 표면 — 어둠 위에 뜬 반투명 패널. 그림자가 아니라 1px 보더로 떠 있다.
 * interactive는 호버 리프트, accent는 인디고 틴트(히어로·결과 패널).
 */
export function Card({
  variant = "resting",
  radius = "lg",
  interactive = false,
  accentBar,
  href,
  padding = "1.5rem",
  className,
  style,
  children,
}: CardProps) {
  const classes = cx(
    "univ-card",
    variant === "accent" && "univ-card--accent",
    radius === "xl" && "univ-card--xl",
    interactive && "univ-card--interactive",
    className,
  );
  const composed: CSSProperties = { padding, ...style };
  const body = (
    <>
      {accentBar && (
        <span
          className="univ-card__bar"
          style={{ backgroundImage: GRADIENT[accentBar] }}
          aria-hidden
        />
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} style={composed}>
        {body}
      </Link>
    );
  }
  return (
    <div className={classes} style={composed}>
      {body}
    </div>
  );
}
