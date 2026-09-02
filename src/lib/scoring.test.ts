import { describe, expect, it } from "vitest";
import { computeResult } from "@/lib/scoring";
import { getTrack } from "@/lib/tracks";
import type { Answers, TrackData } from "@/lib/types";

const syntheticTrack: TrackData = {
  id: "nonmedical",
  name: "테스트",
  universities: ["A대", "B대", "C대"],
  questions: [
    {
      id: "q1",
      text: "실력 문항",
      options: [1, 2, 3, 4, 5].map((v) => ({ value: v, label: `${v}번` })),
      rules: {
        A대: { threshold: 2, mode: "lte" },
        B대: { threshold: 5, mode: "lte" },
        C대: { threshold: 1, mode: "lte" },
      },
    },
    {
      id: "q2",
      text: "성별",
      hardFilter: true,
      options: [1, 2].map((v) => ({ value: v, label: `${v}번` })),
      rules: {
        A대: { threshold: 2, mode: "lte" },
        B대: { threshold: 2, mode: "lte" },
        C대: { threshold: 1, mode: "lte" },
      },
    },
    {
      id: "q3",
      text: "난이도 선호",
      options: [1, 2, 3, 4].map((v) => ({ value: v, label: `${v}번` })),
      rules: {
        A대: { threshold: 2, mode: "eq" },
        B대: { threshold: 3, mode: "eq" },
        C대: { threshold: 2, mode: "eq" },
      },
    },
  ],
};

function allAnswers(track: TrackData, value: number, overrides: Answers = {}): Answers {
  return {
    ...Object.fromEntries(track.questions.map((q) => [q.id, value])),
    ...overrides,
  };
}

describe("computeResult — 규칙 단위", () => {
  it("lte 규칙: 답변 ≤ 임계값이면 득표 (경계 포함)", () => {
    const result = computeResult(syntheticTrack, { q1: 2, q2: 1, q3: 4 });
    const votes = Object.fromEntries(result.ranking.map((s) => [s.university, s.votes]));
    // q1=2: A(2▲)✓ B(5▲)✓ C(1▲)✗ / q2=1: 전원 ✓ / q3=4: eq 전원 ✗
    expect(votes).toEqual({ A대: 2, B대: 2, C대: 1 });
  });

  it("eq 규칙: 정확 일치할 때만 득표", () => {
    const result = computeResult(syntheticTrack, { q1: 5, q2: 1, q3: 3 });
    const b = result.ranking.find((s) => s.university === "B대")!;
    const a = result.ranking.find((s) => s.university === "A대")!;
    expect(b.matched).toContain("q3");
    expect(a.matched).not.toContain("q3");
  });

  it("hardFilter 미충족 대학은 득표와 무관하게 추천 제외", () => {
    // C대는 q1·q3을 충족해 2표지만 성별(q2=2, C대 1▲) 미충족 → 제외
    const result = computeResult(syntheticTrack, { q1: 1, q2: 2, q3: 2 });
    expect(result.excluded.map((s) => s.university)).toEqual(["C대"]);
    expect(result.winners).not.toContain("C대");
    expect(result.excluded[0].eliminated).toBe(true);
    expect(result.excluded[0].votes).toBe(2);
    expect(result.excluded[0].failedFilters).toEqual(["q2"]);
    expect(result.ranking.every((s) => s.failedFilters.length === 0)).toBe(true);
  });

  it("동점 1위는 공동 1위로, 기준표 순서 유지", () => {
    const result = computeResult(syntheticTrack, { q1: 1, q2: 1, q3: 1 });
    expect(result.winners).toEqual(["A대", "B대", "C대"]);
  });

  it("미응답·유효하지 않은 답변은 에러", () => {
    expect(() => computeResult(syntheticTrack, { q1: 1, q2: 1 })).toThrow("미응답");
    expect(() => computeResult(syntheticTrack, { q1: 9, q2: 1, q3: 1 })).toThrow("유효하지 않은");
  });
});

describe("computeResult — 실제 기준표", () => {
  it("비메디컬 전부 1번(최상위 실력·여학생): 난이도까지 일치한 서강대·경희대가 공동 1위", () => {
    const track = getTrack("nonmedical");
    const result = computeResult(track, allAnswers(track, 1));
    expect(result.winners).toEqual(["서강대", "경희대"]);
    expect(result.ranking[0].votes).toBe(track.questions.length);
    expect(result.excluded).toHaveLength(0);
  });

  it("비메디컬 남학생: 이화여대만 지원 불가로 분리", () => {
    const track = getTrack("nonmedical");
    const gender = track.questions.find((q) => q.text === "성별")!;
    const result = computeResult(track, allAnswers(track, 1, { [gender.id]: 2 }));
    expect(result.excluded.map((s) => s.university)).toEqual(["이화여대"]);
    expect(result.ranking.map((s) => s.university)).not.toContain("이화여대");
  });

  it("약대 남학생: 여대 3곳(덕성·숙명·이화) 지원 불가", () => {
    const track = getTrack("pharmacy");
    const gender = track.questions.find((q) => q.text === "성별")!;
    const result = computeResult(track, allAnswers(track, 1, { [gender.id]: 2 }));
    expect(result.excluded.map((s) => s.university).sort()).toEqual(
      ["덕성여대 약대", "숙명여대 약대", "이화여대 약대"].sort(),
    );
  });

  it("약대 과탐 2과목 미응시: 고려대(세종) 등 과탐 필수 대학은 득표와 무관하게 지원 불가", () => {
    const track = getTrack("pharmacy");
    const sci = track.questions.find((q) => q.text.startsWith("수능 과학탐구 2과목"))!;
    expect(sci.hardFilter).toBe(true);
    expect(sci.filterLabel).toBe("과탐 2과목 응시 필요");
    // 과탐만 "아니오"로 바꾸면, 나머지 답이 아무리 좋아도 제외돼야 한다
    const baseline = computeResult(track, allAnswers(track, 1));
    expect(baseline.ranking.map((s) => s.university)).toContain("고려대(세종) 약대");
    const result = computeResult(track, allAnswers(track, 1, { [sci.id]: 2 }));
    const excluded = result.excluded.map((s) => s.university).sort();
    expect(excluded).toEqual(
      ["가천대 약대", "가톨릭대 약대", "고려대(세종) 약대", "동국대 약대", "삼육대 약대"].sort(),
    );
    expect(result.winners).not.toContain("고려대(세종) 약대");
    expect(result.ranking.map((s) => s.university)).not.toContain("고려대(세종) 약대");
    const korea = result.excluded.find((s) => s.university === "고려대(세종) 약대")!;
    expect(korea.failedFilters).toEqual([sci.id]);
    // 제외돼도 득표는 그대로 집계된다(과탐 1표만 빠짐)
    const koreaBefore = baseline.ranking.find((s) => s.university === "고려대(세종) 약대")!;
    expect(korea.votes).toBe(koreaBefore.votes - 1);
    // 과탐이 필수가 아닌 대학(2▲)은 그대로 추천 후보
    expect(result.ranking.map((s) => s.university)).toContain("경희대 약대");
  });

  it("약대 남학생 + 과탐 미응시: 두 필터를 모두 미충족한 대학은 사유가 둘 다 기록된다", () => {
    const track = getTrack("pharmacy");
    const gender = track.questions.find((q) => q.text === "성별")!;
    const sci = track.questions.find((q) => q.text.startsWith("수능 과학탐구 2과목"))!;
    const result = computeResult(track, allAnswers(track, 1, { [gender.id]: 2, [sci.id]: 2 }));
    const byName = Object.fromEntries(result.excluded.map((s) => [s.university, s.failedFilters]));
    expect(byName["덕성여대 약대"]).toEqual([gender.id]);
    expect(byName["고려대(세종) 약대"]).toEqual([sci.id]);
    expect(Object.keys(byName)).toHaveLength(8);
  });

  it("의대 과탐 2과목 미응시: 가톨릭·가천·인하 의대 지원 불가", () => {
    const track = getTrack("medical");
    const sci = track.questions.find((q) => q.text.startsWith("수능 과학탐구 2과목"))!;
    expect(sci.hardFilter).toBe(true);
    const result = computeResult(track, allAnswers(track, 1, { [sci.id]: 2 }));
    expect(result.excluded.map((s) => s.university).sort()).toEqual(
      ["가천대 의대", "가톨릭 의대", "인하대 의대"].sort(),
    );
  });

  it("비메디컬에는 과탐 하드 필터가 없다", () => {
    const track = getTrack("nonmedical");
    expect(track.questions.filter((q) => q.hardFilter).map((q) => q.text)).toEqual(["성별"]);
  });

  it("의대 수능최저 경계: 3합4(3번) 선택 시 성균관(1▲) 미득표, 가톨릭(3▲) 득표", () => {
    const track = getTrack("medical");
    const minReq = track.questions.find((q) => q.text === "수능최저")!;
    const result = computeResult(track, allAnswers(track, 1, { [minReq.id]: 3 }));
    const katolic = result.ranking.find((s) => s.university === "가톨릭 의대")!;
    const skku = result.ranking.find((s) => s.university === "성균관 의대")!;
    expect(katolic.matched).toContain(minReq.id);
    expect(skku.matched).not.toContain(minReq.id);
  });

  it("모든 트랙: 전 조합에서 winners는 항상 1개 이상, 득표는 maxVotes 이하", () => {
    for (const id of ["medical", "pharmacy", "nonmedical"] as const) {
      const track = getTrack(id);
      for (let v = 1; v <= 5; v++) {
        const answers = Object.fromEntries(
          track.questions.map((q) => [q.id, Math.min(v, q.options.length)]),
        );
        const result = computeResult(track, answers);
        expect(result.winners.length).toBeGreaterThan(0);
        for (const s of [...result.ranking, ...result.excluded]) {
          expect(s.votes).toBeLessThanOrEqual(s.maxVotes);
          expect(s.maxVotes).toBe(track.questions.length);
        }
      }
    }
  });
});
