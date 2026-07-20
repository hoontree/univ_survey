import type { Metadata } from "next";
import { isAdminTokenValid } from "@/lib/admin";
import { getStats, type TrackStats } from "@/lib/store";
import { getTrack, getTrackMeta } from "@/lib/tracks";
import { isTrackId } from "@/lib/tracks";

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
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-black">🔒 관리자 통계</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          {check === "미설정"
            ? "ADMIN_TOKEN이 설정되지 않았습니다. 프로젝트 루트의 .env.local에 ADMIN_TOKEN=<토큰> 을 추가한 뒤 서버를 재시작하세요."
            : "접근 권한이 없습니다. /admin?token=<토큰> 형식으로 접속하세요."}
        </p>
      </main>
    );
  }

  const stats = getStats();
  const totalResponses = stats.reduce((sum, s) => sum + s.total, 0);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-black">📊 응답 통계</h1>
      <p className="mt-2 text-sm text-white/55">
        전체 응답 <span className="font-bold text-white">{totalResponses}</span>건
      </p>

      {stats.length === 0 && (
        <p className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
          아직 저장된 응답이 없습니다.
        </p>
      )}

      <div className="mt-8 space-y-8">
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
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">
          {meta.emoji} {meta.name}
        </h2>
        <div className="text-right text-xs text-white/50">
          <p>
            응답 <span className="font-bold text-white">{stats.total}</span>건
          </p>
          {stats.lastResponseAt && <p className="mt-0.5">최근: {stats.lastResponseAt}</p>}
        </div>
      </header>

      <h3 className="mt-6 text-sm font-extrabold text-white/70">1위 추천 대학 분포</h3>
      <ul className="mt-3 space-y-2">
        {winnerEntries.map(([university, count]) => (
          <li key={university} className="flex items-center gap-3 text-xs">
            <span className="w-32 shrink-0 truncate font-bold text-white/75 sm:w-40">
              {university}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${meta.accent}`}
                style={{ width: `${(count / maxWinnerCount) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-bold text-white/60">{count}</span>
          </li>
        ))}
      </ul>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-extrabold text-white/70">
          문항별 답변 분포
        </summary>
        <div className="mt-4 space-y-5">
          {track.questions.map((question) => {
            const counts = stats.answerCounts[question.id] ?? {};
            const maxCount = Math.max(1, ...Object.values(counts));
            return (
              <div key={question.id}>
                <p className="text-xs font-bold text-white/70">{question.text}</p>
                <ul className="mt-2 space-y-1">
                  {question.options.map((option) => {
                    const count = counts[option.value] ?? 0;
                    return (
                      <li key={option.value} className="flex items-center gap-2 text-xs">
                        <span className="w-40 shrink-0 truncate text-white/50 sm:w-56">
                          {option.value}. {option.label}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-white/40"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-white/50">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}
