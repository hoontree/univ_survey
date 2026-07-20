"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { AdmissionTableView } from "@/components/result/AdmissionTableView";
import { ResultActions } from "@/components/result/ResultActions";
import { computeResult } from "@/lib/scoring";
import { loadAnswers } from "@/lib/storage";
import type { TrackMeta } from "@/lib/tracks";
import { useHydrated } from "@/lib/useHydrated";
import type { TrackData, UniversityScore } from "@/lib/types";

export function ResultClient({ track, meta }: { track: TrackData; meta: TrackMeta }) {
  const router = useRouter();
  const hydrated = useHydrated();

  // hydration 후 sessionStorage에서 답변을 읽어 결과 계산 (순수 계산 — 렌더 중 수행)
  const result = useMemo(() => {
    if (!hydrated) return null;
    const answers = loadAnswers(track.id);
    const complete =
      answers && track.questions.every((q) => answers[q.id] !== undefined);
    if (!complete) return "incomplete" as const;
    return computeResult(track, answers);
  }, [hydrated, track]);

  useEffect(() => {
    // 설문을 거치지 않은 직접 진입 → 설문으로 이동
    if (result === "incomplete") router.replace(`/survey/${track.id}`);
  }, [result, router, track.id]);

  if (result === null || result === "incomplete") {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="animate-pulse text-sm font-bold text-white/50">
          🔭 우주를 탐색하는 중...
        </p>
      </main>
    );
  }

  const topVotes = result.ranking[0]?.votes ?? 0;

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-bold text-white/50 transition hover:text-white"
          >
            ← 유니버설
          </Link>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-white/70">
            {meta.emoji} {meta.name}
          </span>
        </header>

        {/* 최종 추천 */}
        <section className="starfield mt-8 overflow-hidden rounded-3xl border border-indigo-400/30 bg-indigo-500/[0.07] px-6 py-10 text-center">
          <p className="text-xs font-black tracking-[0.25em] text-indigo-300">
            🪐 우주설의 최종 추천
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
            {result.winners.map((winner) => (
              <span
                key={winner}
                className={`block bg-gradient-to-r ${meta.accent} bg-clip-text text-transparent`}
              >
                {winner}
              </span>
            ))}
          </h1>
          <p className="mt-4 text-sm font-bold text-white/60">
            {result.totalQuestions}개 문항 중{" "}
            <span className="text-white">{topVotes}개 기준 충족</span>
            {result.winners.length > 1 && (
              <span className="ml-2 rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
                공동 1위 {result.winners.length}곳
              </span>
            )}
          </p>
        </section>

        {/* 전체 득표 랭킹 */}
        <section className="mt-10">
          <h2 className="text-lg font-extrabold">전체 득표 랭킹</h2>
          <p className="mt-1 text-xs text-white/45">
            대학을 누르면 문항별 충족 내역을 볼 수 있어요.
          </p>
          <ol className="mt-4 space-y-2">
            {result.ranking.map((score, rank) => (
              <RankingRow
                key={score.university}
                score={score}
                rank={rank + 1}
                isWinner={result.winners.includes(score.university)}
                track={track}
                accent={meta.accent}
              />
            ))}
          </ol>
        </section>

        {/* 지원 불가 */}
        {result.excluded.length > 0 && (
          <section className="mt-8 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-5">
            <h2 className="text-sm font-extrabold text-rose-200">
              지원이 불가능한 대학
            </h2>
            <p className="mt-1 text-xs text-rose-200/60">
              성별 조건이 맞지 않아 추천에서 제외했어요.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {result.excluded.map((score) => (
                <li
                  key={score.university}
                  className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-100/80"
                >
                  {score.university}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 전형 정보 표 */}
        <AdmissionTableView trackId={track.id} />

        <ResultActions trackId={track.id} />
      </main>
      <footer className="border-t border-white/10 px-6 py-8 text-center">
        <p className="mx-auto max-w-lg text-xs leading-relaxed text-white/40">
          본 추천은 우주설 강사의 논술 기준표를 바탕으로 한 참고용 결과입니다.
          최종 지원 전 반드시 각 대학 모집요강을 확인하세요.
        </p>
      </footer>
    </>
  );
}

function RankingRow({
  score,
  rank,
  isWinner,
  track,
  accent,
}: {
  score: UniversityScore;
  rank: number;
  isWinner: boolean;
  track: TrackData;
  accent: string;
}) {
  const matchedSet = new Set(score.matched);
  const percent = score.maxVotes === 0 ? 0 : (score.votes / score.maxVotes) * 100;

  return (
    <li>
      <details
        className={`group rounded-2xl border transition ${
          isWinner
            ? "border-indigo-400/40 bg-indigo-500/[0.08]"
            : "border-white/10 bg-white/[0.03]"
        }`}
      >
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
              isWinner ? "bg-indigo-400 text-slate-950" : "bg-white/10 text-white/50"
            }`}
          >
            {rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-extrabold sm:text-base">
                {score.university}
                {isWinner && <span className="ml-1.5" aria-hidden>👑</span>}
              </span>
              <span className="shrink-0 text-xs font-bold text-white/55">
                {score.votes}표 / {score.maxVotes}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`bar-fill h-full rounded-full bg-gradient-to-r ${accent} ${
                  isWinner ? "" : "opacity-40"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <span className="text-white/30 transition group-open:rotate-180" aria-hidden>
            ⌄
          </span>
        </summary>
        <div className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed">
          <ul className="space-y-1.5">
            {track.questions.map((q) => {
              const ok = matchedSet.has(q.id);
              return (
                <li key={q.id} className="flex gap-2">
                  <span className={ok ? "text-emerald-400" : "text-rose-400/70"} aria-hidden>
                    {ok ? "✓" : "✕"}
                  </span>
                  <span className={ok ? "text-white/75" : "text-white/40"}>{q.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </li>
  );
}
