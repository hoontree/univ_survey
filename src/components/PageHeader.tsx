import Link from "next/link";
import { Chip } from "@/components/ds/Chip";
import type { TrackMeta } from "@/lib/tracks";

/** 설문·결과 페이지 상단 — 홈 링크 + 현재 트랙 칩. */
export function PageHeader({ meta }: { meta: TrackMeta }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-muted)",
          textDecoration: "none",
          transition: "color var(--dur-fast) var(--ease-out)",
        }}
        className="hover:!text-white"
      >
        ← 유니버설
      </Link>
      <Chip leadingIcon={meta.emoji}>{meta.name}</Chip>
    </header>
  );
}
