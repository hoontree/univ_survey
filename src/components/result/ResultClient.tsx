"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Chip } from "@/components/ds/Chip";
import { Eyebrow } from "@/components/ds/Eyebrow";
import { RankingRow, type RankingBadge } from "@/components/ds/RankingRow";
import { AdmissionTableView } from "@/components/result/AdmissionTableView";
import { ResultActions } from "@/components/result/ResultActions";
import { examScope } from "@/data/exam-scope";
import { findScheduleConflicts, formatExamDate, getExamSchedule } from "@/lib/schedule";
import { computeResult } from "@/lib/scoring";
import { hasGrant, loadAnswers } from "@/lib/storage";
import type { TrackMeta } from "@/lib/tracks";
import { useHydrated } from "@/lib/useHydrated";
import type { TrackData } from "@/lib/types";

export function ResultClient({ track, meta }: { track: TrackData; meta: TrackMeta }) {
  const router = useRouter();
  const hydrated = useHydrated();

  const result = useMemo(() => {
    if (!hydrated) return null;
    const answers = loadAnswers(track.id);
    const complete =
      answers && track.questions.every((q) => answers[q.id] !== undefined);
    // 결과는 사용 횟수 차감이 완료된 세션(grant)에서만 표시
    if (!complete || !hasGrant(track.id)) return "incomplete" as const;
    return computeResult(track, answers);
  }, [hydrated, track]);

  useEffect(() => {
    if (result === "incomplete") router.replace(`/survey/${track.id}`);
  }, [result, router, track.id]);

  if (result === null || result === "incomplete") {
    return (
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
        }}
      >
        <p
          className="animate-pulse"
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-muted)",
          }}
        >
          🔭 우주를 탐색하는 중...
        </p>
      </main>
    );
  }

  const topMax = result.ranking[0]?.maxVotes ?? 0;
  const topFit = topMax === 0 ? 0 : Math.round(((result.ranking[0]?.votes ?? 0) / topMax) * 100);
  const criteriaFor = (matched: string[]) =>
    track.questions.map((q) => ({ label: q.text, ok: matched.includes(q.id) }));

  // 고사일·수능 전 배지 (강사 강의자료 전사본, 일정 없는 대학은 배지 없음)
  const badgesFor = (university: string): RankingBadge[] => {
    const schedule = getExamSchedule(track.id, university);
    if (!schedule) return [];
    const badges: RankingBadge[] = [{ label: `📅 ${formatExamDate(schedule)}` }];
    if (schedule.beforeCsat) badges.push({ label: "수능 전 시험", tone: "warn" });
    return badges;
  };
  // 수학 출제 범위 (details 맨 위)
  const scopeFor = (university: string) => {
    const scope = examScope[track.id][university];
    if (!scope) return undefined;
    return (
      <>
        <span style={{ color: "var(--text-faint)" }}>출제 범위</span> {scope.areas.join(" · ")}
        {scope.note && <span style={{ color: "var(--text-faint)" }}> · {scope.note}</span>}
      </>
    );
  };
  const winnersBeforeCsat = result.winners.filter(
    (u) => getExamSchedule(track.id, u)?.beforeCsat,
  );
  // 추천 후보(지원 불가 제외)끼리 같은 날 같은 시간대면 한 곳만 응시할 수 있다
  const conflicts = findScheduleConflicts(
    track.id,
    result.ranking.map((s) => s.university),
  );

  // 지원 불가 대학을 미충족 하드 필터(문항 × 임계값)별로 묶는다. 문항·임계값 순서 유지.
  const excludedGroups = track.questions
    .filter((q) => q.hardFilter)
    .flatMap((q) => {
      const byThreshold = new Map<number, string[]>();
      for (const s of result.excluded) {
        if (!s.failedFilters.includes(q.id)) continue;
        const threshold = q.rules[s.university]?.threshold ?? 0;
        byThreshold.set(threshold, [...(byThreshold.get(threshold) ?? []), s.university]);
      }
      return [...byThreshold.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([threshold, universities]) => ({
          key: `${q.id}-${threshold}`,
          label: q.filterLabels?.[String(threshold)] ?? q.text,
          universities,
        }));
    });

  return (
    <>
      <main
        style={{
          margin: "0 auto",
          width: "100%",
          maxWidth: "var(--container-result)",
          flex: 1,
          padding: "32px 24px",
        }}
      >
        <PageHeader meta={meta} />

        {/* 최종 추천 */}
        <section
          className="univ-starfield"
          style={{
            marginTop: 32,
            overflow: "hidden",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border-accent)",
            background: "var(--surface-accent-soft)",
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <Eyebrow leadingIcon="🪐" style={{ justifyContent: "center" }}>
            우주설의 최종 추천
          </Eyebrow>
          <h1
            style={{
              margin: "16px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-h1)",
              lineHeight: 1.1,
            }}
          >
            {result.winners.map((winner) => (
              <span
                key={winner}
                className={`univ-gradient-text univ-gradient-text--${track.id}`}
                style={{ display: "block" }}
              >
                {winner}
              </span>
            ))}
          </h1>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-muted)",
            }}
          >
            {result.totalQuestions}개 문항을 분석해{" "}
            <span style={{ color: "var(--text-strong)" }}>AI 적합도 {topFit}%</span>로 추천했어요
            {result.winners.length > 1 && (
              <Chip style={{ marginLeft: 8 }}>공동 1위 {result.winners.length}곳</Chip>
            )}
          </p>
          {winnersBeforeCsat.length > 0 && (
            <p style={{ margin: "12px 0 0", fontSize: "var(--text-xs)", color: "#fde68a" }}>
              ⚠️ {winnersBeforeCsat.join(" · ")}
              {winnersBeforeCsat.length > 1 ? "은(는)" : "는"} 수능 전에 시험을 봐요. 수능 준비
              흐름과 함께 판단하세요.
            </p>
          )}
        </section>

        {/* AI 적합도 랭킹 */}
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
            AI 적합도 랭킹
          </h2>
          <p
            style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}
          >
            대학을 누르면 문항별 분석 내역과 수학 출제 범위를 볼 수 있어요.
          </p>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {result.ranking.map((score, i) => (
              <RankingRow
                key={score.university}
                rank={i + 1}
                university={score.university}
                votes={score.votes}
                maxVotes={score.maxVotes}
                isWinner={result.winners.includes(score.university)}
                track={track.id}
                defaultOpen={i === 0}
                badges={badgesFor(score.university)}
                detailLead={scopeFor(score.university)}
                criteria={criteriaFor(score.matched)}
              />
            ))}
          </div>
        </section>

        {/* 같은 시간대 고사 충돌 */}
        {conflicts.length > 0 && (
          <section
            style={{
              marginTop: 32,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-card)",
              padding: 20,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "var(--text-sm)",
                fontWeight: "var(--fw-bold)",
                color: "var(--text-strong)",
              }}
            >
              같은 시간대에 시험 보는 대학
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "var(--text-xs)",
                color: "var(--text-faint)",
              }}
            >
              한 묶음에서는 한 곳만 응시할 수 있어요. 날짜별로 원서를 정할 때 참고하세요.
            </p>
            {conflicts.map((conflict) => (
              <div key={`${conflict.date}-${conflict.slot}`} style={{ marginTop: 12 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--fw-bold)",
                    color: "var(--text-secondary)",
                  }}
                >
                  📅 {conflict.date}({conflict.day}) {conflict.slot}
                </p>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {conflict.universities.map((university) => (
                    <Chip
                      key={university}
                      variant={result.winners.includes(university) ? "accent" : "outline"}
                    >
                      {university}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 지원 불가 */}
        {result.excluded.length > 0 && (
          <section
            style={{
              marginTop: 32,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--danger-border)",
              background: "var(--danger-soft)",
              padding: 20,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "var(--text-sm)",
                fontWeight: "var(--fw-bold)",
                color: "#fecdd3",
              }}
            >
              지원이 불가능한 대학
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "var(--text-xs)",
                color: "rgba(254,205,211,.6)",
              }}
            >
              지원 자격 조건이 맞지 않아 득표와 상관없이 추천에서 제외했어요.
            </p>
            {excludedGroups.map((group) => (
              <div key={group.key} style={{ marginTop: 12 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--fw-bold)",
                    color: "#fecdd3",
                  }}
                >
                  {group.label}
                </p>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {group.universities.map((university) => (
                    <Chip key={university} variant="danger">
                      {university}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <AdmissionTableView trackId={track.id} />
        <ResultActions trackId={track.id} />
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: "0 auto",
            maxWidth: 512,
            fontSize: "var(--text-xs)",
            lineHeight: 1.85,
            color: "var(--text-faint)",
          }}
        >
          본 추천은 우주설 강사의 논술 기준을 학습한 AI 추천 모델의 참고용 결과입니다.
          최종 지원 전 반드시 각 대학 모집요강을 확인하세요.
        </p>
        <p
          style={{
            margin: "14px 0 0",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-ghost)",
          }}
        >
          신준섭 X 우주설 논술연구소
        </p>
      </footer>
    </>
  );
}
