import type { CSSProperties, ReactNode } from "react";

interface SectionHeadingProps {
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
  style?: CSSProperties;
}

/** 가운데 정렬 섹션 헤더 — 표시 서체 제목 + 선택적 서브타이틀. */
export function SectionHeading({
  title,
  subtitle,
  align = "center",
  className,
  style,
}: SectionHeadingProps) {
  return (
    <div className={className} style={{ textAlign: align, ...style }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-h2)",
          fontWeight: "var(--fw-bold)",
          lineHeight: "var(--leading-snug)",
          color: "var(--text-strong)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            margin: "0.75rem 0 0",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
