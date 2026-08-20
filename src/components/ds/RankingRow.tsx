import { ProgressBar } from "./ProgressBar";
import type { Accent } from "./tokens";

export interface Criterion {
  label: string;
  ok: boolean;
}

interface RankingRowProps {
  rank: number;
  university: string;
  votes: number;
  maxVotes: number;
  isWinner?: boolean;
  track: Accent;
  /** 주면 펼침 가능한 details로 렌더되어 문항별 ✓/✕를 보여줌 */
  criteria?: Criterion[];
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
  criteria,
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
