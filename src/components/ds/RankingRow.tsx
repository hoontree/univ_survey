import type { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";
import type { Accent } from "./tokens";

export interface Criterion {
  label: string;
  ok: boolean;
}

export interface RankingBadge {
  label: string;
  /** warn = 눈에 띄어야 하는 조건("수능 전" 등) */
  tone?: "default" | "warn";
}

interface RankingRowProps {
  rank: number;
  university: string;
  votes: number;
  maxVotes: number;
  isWinner?: boolean;
  track: Accent;
  /** 대학명 아래 작은 배지 — 고사일, 수능 전 여부 등 */
  badges?: RankingBadge[];
  /** 주면 펼침 가능한 details로 렌더되어 문항별 ✓/✕를 보여줌 */
  criteria?: Criterion[];
  /** details 맨 위에 붙는 부가 정보(출제 범위 등) */
  detailLead?: ReactNode;
  defaultOpen?: boolean;
}

/** AI 적합도 랭킹 행 — 순위 배지, 대학명, 적합도 점수, 적합도 바. */
export function RankingRow({
  rank,
  university,
  votes,
  maxVotes,
  isWinner = false,
  track,
  badges,
  criteria,
  detailLead,
  defaultOpen = false,
}: RankingRowProps) {
  const pct = maxVotes === 0 ? 0 : (votes / maxVotes) * 100;
  const shell = {
    borderRadius: "var(--radius-lg)",
    border: `1px solid ${isWinner ? "var(--border-accent)" : "var(--border-subtle)"}`,
    background: isWinner ? "var(--surface-accent-soft)" : "var(--surface-card)",
  };

  const summary = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "flex",
          flex: "0 0 auto",
          width: "1.75rem",
          height: "1.75rem",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--radius-full)",
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--fw-bold)",
          background: isWinner ? "var(--indigo-400)" : "var(--w-10)",
          color: isWinner ? "var(--text-on-accent)" : "var(--text-faint)",
        }}
      >
        {rank}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              fontSize: "var(--text-body)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {university}
            {isWinner && (
              <span aria-hidden style={{ marginLeft: "0.4rem" }}>
                👑
              </span>
            )}
          </span>
          <span
            style={{
              flex: "0 0 auto",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-muted)",
            }}
          >
            적합도 {Math.round(pct)}%
          </span>
        </div>
        {badges && badges.length > 0 && (
          <div
            style={{
              marginTop: "0.3rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.3rem",
            }}
          >
            {badges.map((badge) => (
              <span
                key={badge.label}
                style={{
                  display: "inline-block",
                  borderRadius: "var(--radius-full)",
                  padding: "0.1rem 0.5rem",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--fw-bold)",
                  lineHeight: 1.5,
                  background: badge.tone === "warn" ? "rgba(251,191,36,.14)" : "var(--w-06)",
                  color: badge.tone === "warn" ? "#fde68a" : "var(--text-faint)",
                }}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}
        <ProgressBar
          value={pct}
          track={track}
          animated
          dim={!isWinner}
          style={{ marginTop: "0.4rem" }}
        />
      </div>
      {criteria && (
        <span className="univ-rank__caret" aria-hidden style={{ color: "var(--text-ghost)" }}>
          ⌄
        </span>
      )}
    </div>
  );

  if (!criteria) {
    return <div style={shell}>{summary}</div>;
  }

  return (
    <details className="univ-rank" open={defaultOpen} style={shell}>
      <summary>{summary}</summary>
      <ul
        style={{
          margin: 0,
          padding: "0.75rem 1rem",
          listStyle: "none",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          fontSize: "var(--text-xs)",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        {detailLead && (
          <li
            style={{
              marginBottom: "0.35rem",
              paddingBottom: "0.6rem",
              borderBottom: "1px dashed var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            {detailLead}
          </li>
        )}
        {criteria.map((c) => (
          <li key={c.label} style={{ display: "flex", gap: "0.5rem" }}>
            <span
              aria-hidden
              style={{ color: c.ok ? "var(--success)" : "rgba(251,113,133,.7)" }}
            >
              {c.ok ? "✓" : "✕"}
            </span>
            <span style={{ color: c.ok ? "var(--text-secondary)" : "var(--text-faint)" }}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
