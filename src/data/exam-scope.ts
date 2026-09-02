import type { TrackId } from "@/lib/types";

/**
 * 대학별 수리논술 수학 출제 범위 (2015 개정교육과정 기준, 결과 페이지 랭킹 상세용).
 *
 * 출처: 강사의 2027 원서지원 전략 강의자료(의치한연고 송출용.pdf) 20~21쪽
 *   "2027 의대 / 치한약수 논술(수학) 출제 범위".
 *   약대 표에서 "의대와 같음"으로 묶인 성균관·이화·가톨릭·아주·가천 약대는 의대 범위를 그대로 적용.
 *   부산대 약대는 자료에 없어 비워 둔다. 비메디컬은 강의자료에 표가 없다.
 * 키는 기준표(src/data/criteria/*.json)의 대학명과 같아야 한다.
 * ⚠️ 발행 전 강사 검수 필요.
 */
export type MathArea = "수I·II" | "미적분" | "기하" | "확률과 통계";

export interface ExamScope {
  areas: MathArea[];
  note?: string;
}

const ALL: MathArea[] = ["수I·II", "미적분", "기하", "확률과 통계"];

export const examScope: Record<TrackId, Record<string, ExamScope>> = {
  medical: {
    "가톨릭 의대": { areas: ["수I·II", "미적분", "확률과 통계"] },
    "성균관 의대": { areas: ["수I·II"] },
    "경희대 의대": { areas: ALL },
    "한양대 의대": { areas: ALL },
    "중앙대 의대": { areas: ALL, note: "일반형 기준. 창의형은 확통 제외" },
    "이화여대 의대": { areas: ALL },
    "가천대 의대": { areas: ["수I·II", "미적분"] },
    "아주대 의대": { areas: ["수I·II", "미적분"] },
    "인하대 의대": { areas: ["수I·II", "미적분"] },
    "경북대 의대": { areas: ["수I·II", "미적분"] },
    "부산대 의대": { areas: ["수I·II", "미적분", "기하"] },
  },
  pharmacy: {
    "가천대 약대": { areas: ["수I·II", "미적분"] },
    "가톨릭대 약대": { areas: ["수I·II", "미적분", "확률과 통계"] },
    "경희대 약대": { areas: ALL },
    "고려대(세종) 약대": { areas: ["수I·II", "미적분", "확률과 통계"] },
    "동국대 약대": { areas: ALL },
    "삼육대 약대": { areas: ["수I·II", "미적분"] },
    "성균관대 약대": { areas: ["수I·II"] },
    "아주대 약대": { areas: ["수I·II", "미적분"] },
    "연세대 약대": { areas: ALL },
    "중앙대 약대": {
      areas: ["수I·II", "미적분", "확률과 통계"],
      note: "일반형 기준. 창의형은 기하 포함·확통 제외",
    },
    "덕성여대 약대": { areas: ["수I·II", "미적분"] },
    "숙명여대 약대": { areas: ["수I·II", "미적분"] },
    "이화여대 약대": { areas: ALL },
  },
  nonmedical: {},
};
