import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { type Accent, GLOW, GRADIENT, cx } from "./tokens";

const SIZES = {
  sm: { padding: "0.5rem 1.125rem", fontSize: "var(--text-sm)" },
  md: { padding: "0.625rem 1.5rem", fontSize: "var(--text-sm)" },
  lg: { padding: "1rem 2rem", fontSize: "var(--text-body)" },
} as const;

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: keyof typeof SIZES;
  track?: Accent;
  fullWidth?: boolean;
  disabled?: boolean;
  href?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  type?: "button" | "submit";
  children: ReactNode;
}

/**
 * 필 형태 액션 버튼 — UNIVER設의 기본 CTA.
 * primary는 트랙 그라디언트 + 컬러 글로우, secondary/ghost는 아웃라인/조용한 변형.
 * href가 있으면 Next Link로 렌더.
 */
export function Button({
  variant = "primary",
  size = "md",
  track = "brand",
  fullWidth = false,
  disabled = false,
  href,
  leadingIcon,
  trailingIcon,
  className,
  style,
  onClick,
  type = "button",
  children,
}: ButtonProps) {
  const composed: CSSProperties = {
    ...SIZES[size],
    ...(fullWidth ? { width: "100%" } : null),
    ...(variant === "primary"
      ? { backgroundImage: GRADIENT[track], boxShadow: GLOW[track] }
      : null),
    ...style,
  };
  const classes = cx("univ-btn", `univ-btn--${variant}`, className);
  const body = (
    <>
      {leadingIcon && (
        <span className="univ-btn__ic" aria-hidden>
          {leadingIcon}
        </span>
      )}
      <span>{children}</span>
      {trailingIcon && (
        <span className="univ-btn__ic" aria-hidden>
          {trailingIcon}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        style={composed}
        aria-disabled={disabled || undefined}
      >
        {body}
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      style={composed}
    >
      {body}
    </button>
  );
}
