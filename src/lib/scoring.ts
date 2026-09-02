import type {
  Answers,
  SurveyResult,
  TrackData,
  UniversityScore,
  VoteRule,
} from "@/lib/types";

function passes(rule: VoteRule, answer: number): boolean {
  return rule.mode === "lte" ? answer <= rule.threshold : answer === rule.threshold;
}

/**
 * 설문 응답을 대학별 득표로 집계한다.
 *
 * - 각 문항에서 규칙을 충족한 대학에 +1표
 * - hardFilter 문항(성별·과탐 2과목 응시)을 미충족한 대학은 득표와 무관하게 추천에서 제외
 * - 최다 득표 대학이 최종 추천(동점은 공동 1위), 동점 시 기준표 컬럼 순서 유지
 */
export function computeResult(track: TrackData, answers: Answers): SurveyResult {
  const scores = new Map<string, UniversityScore>(
    track.universities.map((u) => [
      u,
      {
        university: u,
        votes: 0,
        maxVotes: 0,
        matched: [],
        eliminated: false,
        failedFilters: [],
      },
    ]),
  );

  for (const question of track.questions) {
    const answer = answers[question.id];
    if (answer === undefined) {
      throw new Error(`미응답 문항: ${question.id} (${question.text})`);
    }
    if (!question.options.some((o) => o.value === answer)) {
      throw new Error(`유효하지 않은 답변: ${question.id}=${answer}`);
    }
    for (const [university, rule] of Object.entries(question.rules)) {
      const score = scores.get(university);
      if (!score) continue;
      score.maxVotes += 1;
      if (passes(rule, answer)) {
        score.votes += 1;
        score.matched.push(question.id);
      } else if (question.hardFilter) {
        score.eliminated = true;
        score.failedFilters.push(question.id);
      }
    }
  }

  // 대학 배열 순서(기준표 컬럼 순)를 유지한 안정 정렬 → 동점 시 원래 순서
  const all = track.universities.map((u) => scores.get(u)!);
  const ranking = all
    .filter((s) => !s.eliminated)
    .sort((a, b) => b.votes - a.votes);
  const excluded = all.filter((s) => s.eliminated);

  const topVotes = ranking[0]?.votes ?? 0;
  const winners = ranking.filter((s) => s.votes === topVotes).map((s) => s.university);

  return {
    winners,
    ranking,
    excluded,
    totalQuestions: track.questions.length,
  };
}
