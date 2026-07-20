/* eslint-disable @next/next/no-img-element */

/**
 * 공동 브랜드 락업 — JOONLAB(신준섭 연구소) × 우주설 엠블럼 + 표기.
 * chip: 히어로/헤더용 필 형태, footer: 페이지 하단용 세로 배치.
 */
export function BrandLockup({ variant = "chip" }: { variant?: "chip" | "footer" }) {
  const logos = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <img
        src="/brand/joonlab-logo-white.png"
        alt="신준섭 연구소 JOONLAB"
        style={{ height: variant === "chip" ? 14 : 20, width: "auto", opacity: 0.9 }}
      />
      <span
        aria-hidden
        style={{
          fontSize: variant === "chip" ? 10 : 12,
          fontWeight: "var(--fw-bold)",
          color: "var(--text-ghost)",
        }}
      >
        ×
      </span>
      <img
        src="/brand/univer-seol-mark.png"
        alt="우주설 수리논술"
        style={{ height: variant === "chip" ? 18 : 26, width: "auto", opacity: 0.9 }}
      />
    </span>
  );

  if (variant === "footer") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        {logos}
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-bold)",
            letterSpacing: "var(--tracking-wide)",
            color: "var(--text-faint)",
          }}
        >
          신준섭 X 우주설 논술연구소
        </p>
      </div>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        borderRadius: "var(--radius-full)",
        border: "1px solid var(--border-strong)",
        background: "var(--w-06)",
        padding: "8px 18px",
      }}
    >
      {logos}
      <span
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: "var(--fw-bold)",
          letterSpacing: "var(--tracking-wide)",
          color: "var(--text-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        신준섭 X 우주설 논술연구소
      </span>
    </span>
  );
}
