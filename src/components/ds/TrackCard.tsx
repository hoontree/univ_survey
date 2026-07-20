import type { ReactNode } from "react";
import { Card } from "./Card";
import { ACCENT_TEXT, type Accent } from "./tokens";

interface TrackCardProps {
  track: Accent;
  emoji?: ReactNode;
  name: string;
  tagline?: string;
  meta?: string;
  cta?: string;
  href: string;
}

/** 랜딩 계열 선택 카드 — 상단 트랙 바, 이모지, 이름, 태그라인, 메타, "시작하기 →". */
export function TrackCard({
  track,
  emoji,
  name,
  tagline,
  meta,
  cta = "시작하기",
  href,
}: TrackCardProps) {
  return (
    <Card interactive accentBar={track} href={href} className="univ-trackcard">
      {emoji && (
        <span style={{ fontSize: "1.875rem", lineHeight: 1 }} aria-hidden>
          {emoji}
        </span>
      )}
      <h3
        style={{
          margin: "1rem 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-h3)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-strong)",
        }}
      >
        {name}
      </h3>
      {tagline && (
        <p
          style={{
            margin: "0.375rem 0 0",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          {tagline}
        </p>
      )}
      {meta && (
        <p
          style={{
            margin: "1.25rem 0 0",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-faint)",
          }}
        >
          {meta}
        </p>
      )}
      <span className="univ-trackcard__cta" style={{ color: ACCENT_TEXT[track] }}>
        {cta} <span aria-hidden>→</span>
      </span>
    </Card>
  );
}
