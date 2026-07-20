import medical from "@/data/criteria/medical.json";
import pharmacy from "@/data/criteria/pharmacy.json";
import nonmedical from "@/data/criteria/nonmedical.json";
import type { TrackData, TrackId } from "@/lib/types";

/** 트랙별 UI 메타 (디자인 교체 시 이 파일에서 라벨·설명만 손보면 됨) */
export interface TrackMeta {
  id: TrackId;
  name: string;
  tagline: string;
  emoji: string;
  /** Tailwind 그라디언트 클래스 (트랙 카드/결과 강조색) */
  accent: string;
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
    accent: "from-rose-500 to-orange-500",
  },
  {
    id: "pharmacy",
    name: "약대",
    tagline: "전략적으로 노려보는 약학과",
    emoji: "💊",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    id: "nonmedical",
    name: "비메디컬",
    tagline: "주요 대학 자연계 논술 전형",
    emoji: "🚀",
    accent: "from-indigo-500 to-violet-500",
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
