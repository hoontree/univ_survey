export type TrackId = "medical" | "pharmacy" | "nonmedical";

export interface QuestionOption {
  value: number;
  label: string;
}

/** 셀 규칙: lte = "N▲"(답변 ≤ N 득표), eq = "N"(정확 일치 시 득표) */
export interface VoteRule {
  threshold: number;
  mode: "lte" | "eq";
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  /** true면 미충족 대학은 최종 추천에서 제외(지원 불가) — 성별·과탐 2과목 문항 */
  hardFilter?: boolean;
  /** hardFilter 문항의 제외 사유 라벨(결과 화면용). 예: "성별 조건", "과탐 2과목 응시 필요" */
  filterLabel?: string;
  rules: Record<string, VoteRule>;
}

export interface TrackData {
  id: TrackId;
  name: string;
  universities: string[];
  questions: Question[];
}

/** questionId → 선택한 선택지 번호 */
export type Answers = Record<string, number>;

export interface UniversityScore {
  university: string;
  votes: number;
  /** 해당 대학에 규칙이 존재하는 문항 수 (득표 가능 최대치) */
  maxVotes: number;
  /** 충족한 문항 id 목록 */
  matched: string[];
  /** 하드 필터 문항 미충족 → 지원 불가 */
  eliminated: boolean;
  /** 미충족한 하드 필터 문항 id 목록 (eliminated 의 근거) */
  failedFilters: string[];
}

export interface SurveyResult {
  /** 공동 1위 대학 (eliminated 제외) */
  winners: string[];
  /** 득표순 랭킹 (eliminated 제외) */
  ranking: UniversityScore[];
  /** 하드 필터로 제외된 대학 */
  excluded: UniversityScore[];
  totalQuestions: number;
}
