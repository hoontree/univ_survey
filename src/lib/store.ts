import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Answers, TrackId } from "@/lib/types";

/**
 * 응답 저장소 — 로컬 파일 SQLite.
 *
 * ⚠️ 배포 교체 지점: Vercel 같은 서버리스 환경은 로컬 파일이 유지되지 않으므로
 *    배포 시 이 파일의 함수들만 호스팅 DB(Neon/Supabase/Turso) 구현으로 바꾸면 된다.
 *    인터페이스(saveResponse / getStats)는 그대로 유지할 것.
 */
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "responses.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS responses (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        track      TEXT NOT NULL,
        answers    TEXT NOT NULL, -- JSON { questionId: value }
        winners    TEXT NOT NULL, -- JSON string[] (서버에서 재계산한 공동 1위)
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      )
    `);
  }
  return db;
}

export function saveResponse(track: TrackId, answers: Answers, winners: string[]): number {
  const result = getDb()
    .prepare("INSERT INTO responses (track, answers, winners) VALUES (?, ?, ?)")
    .run(track, JSON.stringify(answers), JSON.stringify(winners));
  return Number(result.lastInsertRowid);
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

export function getStats(): TrackStats[] {
  const rows = getDb()
    .prepare("SELECT track, answers, winners, created_at FROM responses ORDER BY id")
    .all() as { track: TrackId; answers: string; winners: string; created_at: string }[];

  const byTrack = new Map<TrackId, TrackStats>();
  for (const row of rows) {
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
    stats.lastResponseAt = row.created_at;
    for (const winner of JSON.parse(row.winners) as string[]) {
      stats.winnerCounts[winner] = (stats.winnerCounts[winner] ?? 0) + 1;
    }
    for (const [qid, value] of Object.entries(JSON.parse(row.answers) as Answers)) {
      stats.answerCounts[qid] ??= {};
      stats.answerCounts[qid][value] = (stats.answerCounts[qid][value] ?? 0) + 1;
    }
  }
  return [...byTrack.values()];
}
