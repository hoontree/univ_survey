import type { Metadata } from "next";
import { AccountManager } from "@/components/admin/AccountManager";
import { AdminAuth } from "@/components/admin/AdminAuth";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { TokenGenerator } from "@/components/admin/TokenGenerator";
import { Card } from "@/components/ds/Card";
import { StatBar } from "@/components/ds/StatBar";
import { getSessionUser } from "@/lib/admin-auth";
import { hasAnyAdmin, listAdmins } from "@/lib/admins";
import { getStats, type TrackStats } from "@/lib/store";
import { formatCode, listTokens, type TokenRecord } from "@/lib/tokens";
import { getTrack, getTrackMeta, isTrackId } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getSessionUser();

  if (!user) {
    // 세션 없음 → 로그인 (관리자 계정이 하나도 없으면 최초 설정 모드)
    let setup = false;
    try {
      setup = !(await hasAnyAdmin());
    } catch {
      // Firestore 접근 불가(로컬 ADC 없음 등) → 로그인 화면으로 폴백
    }
    return (
      <main
        style={{
          margin: "0 auto",
          display: "flex",
          width: "100%",
          maxWidth: 480,
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <AdminAuth mode={setup ? "setup" : "login"} />
      </main>
    );
  }

  const [stats, tokens, admins] = await Promise.all([
    getStats(),
    listTokens(),
    listAdmins(),
  ]);
  const totalResponses = stats.reduce((sum, s) => sum + s.total, 0);

  return (
    <main
      style={{
        margin: "0 auto",
        width: "100%",
        maxWidth: "var(--container-page)",
        flex: 1,
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--fw-bold)",
              letterSpacing: "var(--tracking-wide)",
              color: "var(--text-faint)",
            }}
          >
            신준섭 X 우주설 논술연구소
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-h2)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-strong)",
            }}
          >
            📊 관리자
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            <b style={{ color: "var(--text-secondary)" }}>{user}</b>님 · 전체 응답{" "}
            <span style={{ fontFamily: "var(--font-display)", color: "var(--text-strong)" }}>
              {totalResponses}
            </span>
            건
          </p>
        </div>
        <LogoutButton />
      </div>

      <TokenSection tokens={tokens} />

      <Card radius="xl" padding="24px" style={{ marginTop: 32 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-strong)",
          }}
        >
          👤 관리자 계정
        </h2>
        <p style={{ margin: "6px 0 16px", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          계정을 추가하면 다른 운영자도 아이디·비밀번호로 로그인할 수 있어요.
        </p>
        <AccountManager me={user} initialAdmins={admins} />
      </Card>

      {stats.length === 0 && (
        <Card style={{ marginTop: 48, padding: 32, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            아직 저장된 응답이 없습니다.
          </p>
        </Card>
      )}

      <div
        style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 32 }}
      >
        {stats.map((trackStats) => (
          <TrackStatsCard key={trackStats.track} stats={trackStats} />
        ))}
      </div>
    </main>
  );
}

const LIST_LIMIT = 50;

function TokenSection({ tokens }: { tokens: TokenRecord[] }) {
  const unused = tokens.filter((t) => t.uses === 0).length;
  const exhausted = tokens.filter((t) => t.uses >= t.maxUses).length;
  const inUse = tokens.length - unused - exhausted;

  return (
    <Card radius="xl" padding="24px" style={{ marginTop: 32 }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-strong)",
          }}
        >
          🎟️ 이용 토큰
        </h2>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          전체 <b style={{ color: "var(--text-strong)" }}>{tokens.length}</b> · 미사용{" "}
          <b style={{ color: "var(--success)" }}>{unused}</b> · 사용 중{" "}
          <b style={{ color: "var(--text-accent)" }}>{inUse}</b> · 소진{" "}
          <b style={{ color: "var(--danger)" }}>{exhausted}</b>
        </p>
      </header>
      <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
        토큰 1개로 결과를 2회 받을 수 있어요. 수강생에게 한 코드씩 나눠주세요.
      </p>

      <div style={{ marginTop: 20 }}>
        <TokenGenerator />
      </div>

      {tokens.length > 0 && (
        <details style={{ marginTop: 20 }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-secondary)",
            }}
          >
            발급된 토큰 목록 (최근 {Math.min(tokens.length, LIST_LIMIT)}개)
          </summary>
          <div
            style={{
              marginTop: 12,
              overflowX: "auto",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <table
              className="univ-table"
              style={{
                width: "100%",
                minWidth: 420,
                borderCollapse: "collapse",
                fontSize: "var(--text-xs)",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "var(--surface-raised)" }}>
                  {["코드", "사용", "상태", "생성일"].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--border-subtle)",
                        fontWeight: "var(--fw-bold)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tokens.slice(0, LIST_LIMIT).map((t) => {
                  const state =
                    t.uses >= t.maxUses ? "소진" : t.uses > 0 ? "사용 중" : "미사용";
                  const color =
                    t.uses >= t.maxUses
                      ? "var(--danger)"
                      : t.uses > 0
                        ? "var(--text-accent)"
                        : "var(--success)";
                  return (
                    <tr key={t.code} style={{ borderBottom: "1px solid var(--w-06)" }}>
                      <td
                        style={{
                          padding: "8px 12px",
                          fontFamily: "ui-monospace, Menlo, monospace",
                          letterSpacing: "0.06em",
                          color: "var(--text-primary)",
                        }}
                      >
                        {formatCode(t.code)}
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                        {t.uses} / {t.maxUses}
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: "var(--fw-bold)", color }}>
                        {state}
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--text-faint)" }}>
                        {t.createdAt.slice(0, 10)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}

function TrackStatsCard({ stats }: { stats: TrackStats }) {
  if (!isTrackId(stats.track)) return null;
  const track = getTrack(stats.track);
  const meta = getTrackMeta(stats.track);
  const winnerEntries = Object.entries(stats.winnerCounts).sort((a, b) => b[1] - a[1]);
  const maxWinnerCount = winnerEntries[0]?.[1] ?? 1;

  return (
    <Card radius="xl" padding="24px">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-strong)",
          }}
        >
          {meta.emoji} {meta.name}
        </h2>
        <div
          style={{ textAlign: "right", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
        >
          <p style={{ margin: 0 }}>
            응답 <span style={{ color: "var(--text-strong)" }}>{stats.total}</span>건
          </p>
          {stats.lastResponseAt && (
            <p style={{ margin: "2px 0 0" }}>최근: {stats.lastResponseAt}</p>
          )}
        </div>
      </header>

      <h3
        style={{
          margin: "24px 0 0",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-secondary)",
        }}
      >
        1위 추천 대학 분포
      </h3>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {winnerEntries.map(([university, count]) => (
          <StatBar
            key={university}
            label={university}
            count={count}
            max={maxWinnerCount}
            track={stats.track}
          />
        ))}
      </div>

      <details style={{ marginTop: 24 }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-secondary)",
          }}
        >
          문항별 답변 분포
        </summary>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 20 }}>
          {track.questions.map((question) => {
            const counts = stats.answerCounts[question.id] ?? {};
            const maxCount = Math.max(1, ...Object.values(counts));
            return (
              <div key={question.id}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--fw-bold)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {question.text}
                </p>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {question.options.map((option) => (
                    <StatBar
                      key={option.value}
                      label={`${option.value}. ${option.label}`}
                      count={counts[option.value] ?? 0}
                      max={maxCount}
                      track="muted"
                      labelWidth="14rem"
                      height={6}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </Card>
  );
}
