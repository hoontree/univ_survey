import type { Metadata } from "next";
import { Card } from "@/components/ds/Card";
import { StatBar } from "@/components/ds/StatBar";
import { isAdminTokenValid } from "@/lib/admin";
import { getStats, type TrackStats } from "@/lib/store";
import { getTrack, getTrackMeta, isTrackId } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "관리자 통계",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function AdminPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const check = isAdminTokenValid(token);

  if (check !== true) {
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
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-h3)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-strong)",
          }}
        >
          🔒 관리자 통계
        </h1>
        <p
          style={{
            margin: "16px 0 0",
            fontSize: "var(--text-sm)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--text-muted)",
          }}
        >
          {check === "미설정"
            ? "ADMIN_TOKEN이 설정되지 않았습니다. 프로젝트 루트의 .env.local에 ADMIN_TOKEN=<토큰> 을 추가한 뒤 서버를 재시작하세요."
            : "접근 권한이 없습니다. /admin?token=<토큰> 형식으로 접속하세요."}
        </p>
      </main>
    );
  }

  const stats = await getStats();
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
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-h2)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-strong)",
        }}
      >
        📊 응답 통계
      </h1>
      <p style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        전체 응답{" "}
        <span
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-strong)",
          }}
        >
          {totalResponses}
        </span>
        건
      </p>

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
