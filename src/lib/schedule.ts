import { examSchedule, type ExamSchedule, type ExamSlot } from "@/data/exam-schedule";
import type { TrackId } from "@/lib/types";

const SLOT_ORDER: ExamSlot[] = ["오전", "오후", "저녁"];

export function getExamSchedule(track: TrackId, university: string): ExamSchedule | undefined {
  return examSchedule[track][university];
}

/** "11/22(일) 오전" — 하루 종일이면 "11/22(일) 오전/오후" */
export function formatExamDate(schedule: ExamSchedule): string {
  return `${schedule.date}(${schedule.day}) ${schedule.slots.join("/")}`;
}

export interface ScheduleConflict {
  date: string;
  day: string;
  /** "오전" 또는 겹치는 시간대가 여럿이면 "오전/오후" */
  slot: string;
  /** 입력 순서(랭킹 순) 유지 */
  universities: string[];
}

/**
 * 같은 날 같은 시간대에 시험을 보는 대학 묶음 — 한 곳만 응시할 수 있다.
 * 일정이 없는 대학은 무시한다. 하루 종일(오전+오후)인 대학은 그날 양쪽 묶음 모두에 들어간다.
 */
export function findScheduleConflicts(track: TrackId, universities: string[]): ScheduleConflict[] {
  const byKey = new Map<string, { date: string; day: string; slot: ExamSlot; universities: string[] }>();
  for (const university of universities) {
    const schedule = getExamSchedule(track, university);
    if (!schedule) continue;
    for (const slot of schedule.slots) {
      const key = `${schedule.date} ${slot}`;
      const group = byKey.get(key) ?? {
        date: schedule.date,
        day: schedule.day,
        slot,
        universities: [],
      };
      group.universities.push(university);
      byKey.set(key, group);
    }
  }

  const conflicts: ScheduleConflict[] = [];
  for (const group of byKey.values()) {
    if (group.universities.length < 2) continue;
    // 같은 날, 같은 대학 묶음이 이미 있으면(하루 종일 대학 때문) 시간대만 합친다
    const same = conflicts.find(
      (c) =>
        c.date === group.date &&
        c.universities.length === group.universities.length &&
        c.universities.every((u, i) => u === group.universities[i]),
    );
    if (same) {
      same.slot = `${same.slot}/${group.slot}`;
      continue;
    }
    conflicts.push({ ...group });
  }

  const dateKey = (date: string) => {
    const [month, day] = date.split("/").map(Number);
    return month * 100 + day;
  };
  return conflicts.sort(
    (a, b) =>
      dateKey(a.date) - dateKey(b.date) ||
      SLOT_ORDER.indexOf(a.slot.split("/")[0] as ExamSlot) -
        SLOT_ORDER.indexOf(b.slot.split("/")[0] as ExamSlot),
  );
}
