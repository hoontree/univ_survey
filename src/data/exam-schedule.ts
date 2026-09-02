import type { TrackId } from "@/lib/types";

/**
 * 대학별 논술 고사 일시 (결과 페이지 랭킹 배지·같은 시간대 충돌 경고용).
 *
 * 출처: 강사의 2027 원서지원 전략 강의자료(의치한연고 송출용.pdf) 22쪽
 *   "2027 의치한약수 논술전형 일정" + 세부 시각은 전형 정보 표(admission-info.ts)에서.
 *   비메디컬은 강의자료에 일정표가 없어 수능 전 시험이 확실한 연세대만 둔다.
 * 키는 기준표(src/data/criteria/*.json)의 대학명과 같아야 한다 — schedule.test.ts가 검사.
 * ⚠️ 발행 전 강사 검수 필요.
 */
export type ExamSlot = "오전" | "오후" | "저녁";

export interface ExamSchedule {
  /** "11/22" 형식 */
  date: string;
  /** 요일 한 글자 */
  day: string;
  /** 시간대. 하루 종일(오전/오후 미정)이면 둘 다 */
  slots: ExamSlot[];
  /** 알려진 입실·시작 시각 */
  time?: string;
  /** 수능(11/19) 전에 치르는 시험 */
  beforeCsat?: boolean;
  note?: string;
}

/** 2027학년도 대학수학능력시험일 */
export const CSAT_DATE = "11/19(목)";

export const examSchedule: Record<TrackId, Record<string, ExamSchedule>> = {
  medical: {
    "가톨릭 의대": { date: "11/22", day: "일", slots: ["오전"], time: "09:30" },
    "성균관 의대": { date: "11/22", day: "일", slots: ["오후"], time: "17:00" },
    "경희대 의대": { date: "11/21", day: "토", slots: ["오후"], time: "15:00" },
    "한양대 의대": { date: "11/29", day: "일", slots: ["오후"], time: "17:00" },
    "중앙대 의대": {
      date: "11/28",
      day: "토",
      slots: ["오후"],
      time: "14:00",
      note: "일반형 기준. 창의형은 10/11(일) 오후, 수능 전",
    },
    "이화여대 의대": { date: "11/29", day: "일", slots: ["오후"], time: "14:20" },
    "가천대 의대": { date: "11/29", day: "일", slots: ["오전"] },
    "아주대 의대": { date: "12/5", day: "토", slots: ["저녁"], time: "19:00" },
    "인하대 의대": { date: "12/6", day: "일", slots: ["오전", "오후"] },
    "경북대 의대": { date: "11/28", day: "토", slots: ["오후"], time: "16:00" },
    "부산대 의대": { date: "11/28", day: "토", slots: ["오전"], time: "09:30" },
  },
  pharmacy: {
    "가천대 약대": { date: "11/29", day: "일", slots: ["오전"] },
    "가톨릭대 약대": { date: "11/22", day: "일", slots: ["오전"], time: "09:30" },
    "경희대 약대": { date: "11/21", day: "토", slots: ["오후"], time: "15:00" },
    "고려대(세종) 약대": { date: "11/28", day: "토", slots: ["오후"], time: "14:30 입실" },
    "동국대 약대": { date: "11/22", day: "일", slots: ["오전"], time: "09:30" },
    "부산대 약대": { date: "11/28", day: "토", slots: ["오전"], time: "09:30" },
    "삼육대 약대": { date: "11/24", day: "화", slots: ["오전", "오후"] },
    "성균관대 약대": { date: "11/22", day: "일", slots: ["오후"], time: "17:00" },
    "아주대 약대": { date: "12/6", day: "일", slots: ["오후"], time: "14:00" },
    "연세대 약대": { date: "10/10", day: "토", slots: ["오전"], time: "10:30", beforeCsat: true },
    "중앙대 약대": {
      date: "11/28",
      day: "토",
      slots: ["오후"],
      time: "14:00",
      note: "일반형 기준. 창의형은 10/11(일) 오후, 수능 전",
    },
    "덕성여대 약대": { date: "11/29", day: "일", slots: ["오후"] },
    "숙명여대 약대": { date: "11/21", day: "토", slots: ["오전"] },
    "이화여대 약대": { date: "11/29", day: "일", slots: ["오후"], time: "14:20" },
  },
  nonmedical: {
    연세대: { date: "10/10", day: "토", slots: ["오전"], beforeCsat: true },
  },
};
