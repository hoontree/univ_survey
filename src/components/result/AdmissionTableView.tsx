import { admissionInfo } from "@/data/admission-info";
import type { TrackId } from "@/lib/types";

export function AdmissionTableView({ trackId }: { trackId: TrackId }) {
  const table = admissionInfo[trackId];
  return (
    <section style={{ marginTop: 40 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-lg)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-strong)",
        }}
      >
        {table.title}
      </h2>
      <div
        style={{
          marginTop: 16,
          overflowX: "auto",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <table
          className="univ-table"
          style={{
            width: "100%",
            minWidth: 680,
            borderCollapse: "collapse",
            fontSize: "var(--text-xs)",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ background: "var(--surface-raised)" }}>
              {table.columns.map((column) => (
                <th
                  key={column}
                  style={{
                    whiteSpace: "pre-line",
                    borderBottom: "1px solid var(--border-subtle)",
                    padding: "10px 12px",
                    fontWeight: "var(--fw-bold)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 ? "var(--w-03)" : "transparent" }}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    style={{
                      whiteSpace: "pre-line",
                      borderBottom: "1px solid var(--w-06)",
                      padding: "10px 12px",
                      verticalAlign: "top",
                      lineHeight: "var(--leading-normal)",
                      fontWeight: j === 0 ? "var(--fw-bold)" : "var(--fw-regular)",
                      color: j === 0 ? "var(--text-primary)" : "var(--text-muted)",
                    }}
                  >
                    {cell || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-muted)",
          }}
        >
          {table.note}
        </p>
      )}
      <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-ghost)" }}>
        전형 정보는 변경될 수 있어요. 최종 지원 전 반드시 각 대학 모집요강을
        확인하세요.
      </p>
    </section>
  );
}
