import medical from "@/data/criteria/medical.json";
import pharmacy from "@/data/criteria/pharmacy.json";
import nonmedical from "@/data/criteria/nonmedical.json";
import type { TrackData, TrackId } from "@/lib/types";

/** 트랙별 UI 메타. 강조색은 트랙 id가 곧 그라디언트 키(디자인 시스템 규약). */
export interface TrackMeta {
  id: TrackId;
  name: string;
  tagline: string;
  emoji: string;
}

const TRACK_DATA: Record<TrackId, TrackData> = {
  medical: medical as TrackData,
  pharmacy: pharmacy as TrackData,
  nonmedical: nonmedical as TrackData,
};

export const TRACK_METAS: TrackMeta[] = [
  {
    id: "medical",
    name: "의대",
    tagline: "최상위 수리논술로 향하는 길",
    emoji: "🩺",
  },
  {
    id: "pharmacy",
    name: "약대",
    tagline: "전략적으로 노려보는 약학과",
    emoji: "💊",
  },
  {
    id: "nonmedical",
    name: "비메디컬",
    tagline: "주요 대학 자연계 논술 전형",
    emoji: "🚀",
  },
];

export function isTrackId(value: string): value is TrackId {
  return value in TRACK_DATA;
}

export function getTrack(id: TrackId): TrackData {
  return TRACK_DATA[id];
}

export function getTrackMeta(id: TrackId): TrackMeta {
  return TRACK_METAS.find((m) => m.id === id)!;
}
