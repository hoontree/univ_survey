import { Firestore, type Settings } from "@google-cloud/firestore";
import type { Answers, TrackId } from "@/lib/types";

/**
 * 응답 저장소 — Firestore (asia-northeast3).
 *
 * 인증은 Application Default Credentials로 자동 해결된다.
 *  - Cloud Run: 서비스 계정이 자동 주입
 *  - 로컬: `gcloud auth application-default login`
 *
 * 저장 내용은 트랙·답변 번호·추천 결과뿐이며 개인정보는 담지 않는다.
 */
const COLLECTION = "responses";

let db: Firestore | null = null;

function getDb(): Firestore {
  if (!db) {
    const settings: Settings = {};
    // Cloud Run에서는 메타데이터로 자동 해결되지만, 로컬에서는 명시가 필요할 수 있다
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT;
    if (projectId) settings.projectId = projectId;
    db = new Firestore(settings);
  }
  return db;
}

export async function saveResponse(
  track: TrackId,
  answers: Answers,
  winners: string[],
): Promise<string> {
  const doc = await getDb().collection(COLLECTION).add({
    track,
    answers,
    winners,
    createdAt: new Date().toISOString(),
  });
  return doc.id;
}

export interface TrackStats {
  track: TrackId;
  total: number;
  /** 대학 → 1위 추천 횟수 (공동 1위는 각각 집계) */
  winnerCounts: Record<string, number>;
  /** questionId → 선택지 번호 → 응답 수 */
  answerCounts: Record<string, Record<number, number>>;
  lastResponseAt: string | null;
}

interface ResponseDoc {
  track: TrackId;
  answers: Answers;
  winners: string[];
  createdAt: string;
}

/* 관리자 페이지는 강사가 직접 열어보므로 새로고침이 잦을 수 있다.
   매번 전체 문서를 읽으면 Firestore 읽기 할당량이 빠르게 소진되어,
   인스턴스 메모리에 짧게 캐시한다. (인스턴스가 꺼지면 자연히 사라짐) */
const STATS_TTL_MS = 60_000;
let statsCache: { at: number; value: TrackStats[] } | null = null;

export async function getStats(): Promise<TrackStats[]> {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) {
    return statsCache.value;
  }

  const snapshot = await getDb().collection(COLLECTION).orderBy("createdAt").get();

  const byTrack = new Map<TrackId, TrackStats>();
  for (const doc of snapshot.docs) {
    const row = doc.data() as ResponseDoc;
    let stats = byTrack.get(row.track);
    if (!stats) {
      stats = {
        track: row.track,
        total: 0,
        winnerCounts: {},
        answerCounts: {},
        lastResponseAt: null,
      };
      byTrack.set(row.track, stats);
    }
    stats.total += 1;
    stats.lastResponseAt = row.createdAt;
    for (const winner of row.winners ?? []) {
      stats.winnerCounts[winner] = (stats.winnerCounts[winner] ?? 0) + 1;
    }
    for (const [qid, value] of Object.entries(row.answers ?? {})) {
      stats.answerCounts[qid] ??= {};
      stats.answerCounts[qid][value] = (stats.answerCounts[qid][value] ?? 0) + 1;
    }
  }

  const value = [...byTrack.values()];
  statsCache = { at: Date.now(), value };
  return value;
}
