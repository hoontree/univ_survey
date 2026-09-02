import { describe, expect, it } from "vitest";
import { examSchedule } from "@/data/exam-schedule";
import { examScope } from "@/data/exam-scope";
import { findScheduleConflicts, formatExamDate, getExamSchedule } from "@/lib/schedule";
import { getTrack } from "@/lib/tracks";

describe("보조 데이터 — 기준표 대학명과 일치", () => {
  it("의대·약대는 모든 대학에 고사 일정이 있고, 일정 키는 기준표에 있는 대학이다", () => {
    for (const id of ["medical", "pharmacy"] as const) {
      const universities = getTrack(id).universities;
      expect(Object.keys(examSchedule[id]).sort()).toEqual([...universities].sort());
    }
    for (const key of Object.keys(examSchedule.nonmedical)) {
      expect(getTrack("nonmedical").universities).toContain(key);
    }
  });

  it("출제 범위 키는 기준표에 있는 대학이고, 약대는 부산대만 비어 있다", () => {
    for (const id of ["medical", "pharmacy", "nonmedical"] as const) {
      for (const key of Object.keys(examScope[id])) {
        expect(getTrack(id).universities).toContain(key);
      }
    }
    expect(Object.keys(examScope.medical).sort()).toEqual([...getTrack("medical").universities].sort());
    const missing = getTrack("pharmacy").universities.filter((u) => !examScope.pharmacy[u]);
    expect(missing).toEqual(["부산대 약대"]);
  });

  it("수능 전 시험은 연세대 약대·연세대(비메디컬)뿐이고 날짜가 수능(11/19) 앞이다", () => {
    const before = (["medical", "pharmacy", "nonmedical"] as const).flatMap((id) =>
      Object.entries(examSchedule[id])
        .filter(([, s]) => s.beforeCsat)
        .map(([u, s]) => [id, u, s.date] as const),
    );
    expect(before).toEqual([
      ["pharmacy", "연세대 약대", "10/10"],
      ["nonmedical", "연세대", "10/10"],
    ]);
  });
});

describe("findScheduleConflicts", () => {
  it("약대 전체: 같은 날 같은 시간대 묶음 3개, 날짜순", () => {
    const conflicts = findScheduleConflicts("pharmacy", getTrack("pharmacy").universities);
    expect(conflicts).toEqual([
      { date: "11/22", day: "일", slot: "오전", universities: ["가톨릭대 약대", "동국대 약대"] },
      { date: "11/28", day: "토", slot: "오후", universities: ["고려대(세종) 약대", "중앙대 약대"] },
      { date: "11/29", day: "일", slot: "오후", universities: ["덕성여대 약대", "이화여대 약대"] },
    ]);
  });

  it("의대 전체: 11/28 오후 중앙·경북, 11/29 오후 한양·이화", () => {
    const conflicts = findScheduleConflicts("medical", getTrack("medical").universities);
    expect(conflicts.map((c) => [c.date, c.slot, c.universities])).toEqual([
      ["11/28", "오후", ["중앙대 의대", "경북대 의대"]],
      ["11/29", "오후", ["한양대 의대", "이화여대 의대"]],
    ]);
  });

  it("추천 후보에 한 곳만 있으면 충돌이 아니다 — 입력 순서(랭킹)를 지킨다", () => {
    expect(findScheduleConflicts("pharmacy", ["가톨릭대 약대", "경희대 약대"])).toEqual([]);
    const [c] = findScheduleConflicts("pharmacy", ["중앙대 약대", "고려대(세종) 약대"]);
    expect(c.universities).toEqual(["중앙대 약대", "고려대(세종) 약대"]);
  });

  it("하루 종일 시험은 그날 오전·오후 대학 모두와 겹치고, 같은 묶음이면 시간대를 합친다", () => {
    // 삼육대(11/24 오전/오후)는 다른 대학과 날짜가 겹치지 않아 단독
    expect(findScheduleConflicts("pharmacy", ["삼육대 약대", "가톨릭대 약대"])).toEqual([]);
    // 아주 약대(12/6 오후)와 인하 의대(12/6 종일)는 트랙이 달라 비교 대상이 아니다 — 같은 트랙끼리만
    const inha = getExamSchedule("medical", "인하대 의대")!;
    expect(formatExamDate(inha)).toBe("12/6(일) 오전/오후");
  });

  it("일정 없는 대학(비메디컬 대부분)은 무시한다", () => {
    expect(findScheduleConflicts("nonmedical", getTrack("nonmedical").universities)).toEqual([]);
    expect(getExamSchedule("nonmedical", "고려대")).toBeUndefined();
  });
});
