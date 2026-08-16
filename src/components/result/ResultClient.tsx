"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Chip } from "@/components/ds/Chip";
import { Eyebrow } from "@/components/ds/Eyebrow";
import { RankingRow } from "@/components/ds/RankingRow";
import { AdmissionTableView } from "@/components/result/AdmissionTableView";
import { ResultActions } from "@/components/result/ResultActions";
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

  const topVotes = result.ranking[0]?.votes ?? 0;
  const criteriaFor = (matched: string[]) =>
    track.questions.map((q) => ({ label: q.text, ok: matched.includes(q.id) }));

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
            {result.totalQuestions}개 문항 중{" "}
            <span style={{ color: "var(--text-strong)" }}>{topVotes}개 기준 충족</span>
            {result.winners.length > 1 && (
              <Chip style={{ marginLeft: 8 }}>공동 1위 {result.winners.length}곳</Chip>
            )}
          </p>
        </section>

        {/* 전체 득표 랭킹 */}
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
            전체 득표 랭킹
          </h2>
          <p
            style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}
          >
            대학을 누르면 문항별 충족 내역을 볼 수 있어요.
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
                criteria={criteriaFor(score.matched)}
              />
            ))}
          </div>
        </section>

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
              성별 조건이 맞지 않아 추천에서 제외했어요.
            </p>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {result.excluded.map((score) => (
                <Chip key={score.university} variant="danger">
                  {score.university}
                </Chip>
              ))}
            </div>
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
          본 추천은 우주설 강사의 논술 기준표를 바탕으로 한 참고용 결과입니다. 최종
          지원 전 반드시 각 대학 모집요강을 확인하세요.
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
