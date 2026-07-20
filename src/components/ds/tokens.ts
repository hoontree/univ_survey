import type { TrackId } from "@/lib/types";

/** 그라디언트/글로우를 고르는 키 — 트랙 3종 + 브랜드 기본값 */
export type Accent = TrackId | "brand";

export const GRADIENT: Record<Accent, string> = {
  brand: "var(--gradient-brand)",
  medical: "var(--gradient-medical)",
  pharmacy: "var(--gradient-pharmacy)",
  nonmedical: "var(--gradient-nonmedical)",
};

export const GLOW: Record<Accent, string> = {
  brand: "var(--glow-accent)",
  medical: "var(--glow-medical)",
  pharmacy: "var(--glow-pharmacy)",
  nonmedical: "var(--glow-accent)",
};

/** 트랙별 텍스트 강조색 (CTA·아이브로우) */
export const ACCENT_TEXT: Record<Accent, string> = {
  brand: "var(--text-accent)",
  medical: "var(--rose-400)",
  pharmacy: "var(--emerald-400)",
  nonmedical: "var(--indigo-300)",
};

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
