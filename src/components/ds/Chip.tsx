import type { CSSProperties, ReactNode } from "react";

const VARIANTS = {
  default: {
    background: "var(--w-06)",
    borderColor: "var(--border-strong)",
    color: "var(--text-secondary)",
  },
  accent: {
    background: "var(--w-06)",
    borderColor: "var(--border-strong)",
    color: "var(--text-accent)",
  },
  solid: {
    background: "var(--indigo-400)",
    borderColor: "transparent",
    color: "var(--text-on-accent)",
  },
  danger: {
    background: "rgba(244,63,94,.10)",
    borderColor: "var(--danger-border)",
    color: "#fecdd3",
  },
  outline: {
    background: "transparent",
    borderColor: "var(--border-strong)",
    color: "var(--text-secondary)",
  },
} as const;

interface ChipProps {
  variant?: keyof typeof VARIANTS;
  leadingIcon?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** 작은 라운드 라벨 — 아이브로우 배지, 트랙 칩, "공동 1위" 태그, 지원 불가 필. */
export function Chip({
  variant = "default",
  leadingIcon,
  className,
  style,
  children,
}: ChipProps) {
  const v = VARIANTS[variant];
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        borderRadius: "var(--radius-full)",
        border: "1px solid",
        borderColor: v.borderColor,
        background: v.background,
        color: v.color,
        padding: "0.35rem 0.85rem",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--fw-bold)",
        letterSpacing: "var(--tracking-wide)",
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {leadingIcon && <span aria-hidden>{leadingIcon}</span>}
      {children}
    </span>
  );
}
