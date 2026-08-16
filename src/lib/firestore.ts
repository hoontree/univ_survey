import { Firestore, type Settings } from "@google-cloud/firestore";

/**
 * Firestore 클라이언트 (asia-northeast3) — 컬렉션별 모듈이 공유한다.
 *
 * 인증은 Application Default Credentials로 자동 해결된다.
 *  - Cloud Run: 서비스 계정이 자동 주입
 *  - 로컬: `gcloud auth application-default login`
 */
let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!db) {
    const settings: Settings = {};
    // Cloud Run에서는 메타데이터로 자동 해결되지만, 로컬에서는 명시가 필요할 수 있다
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT;
    if (projectId) settings.projectId = projectId;
    db = new Firestore(settings);
  }
  return db;
}
