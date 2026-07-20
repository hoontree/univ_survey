"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearAnswers } from "@/lib/storage";
import type { TrackId } from "@/lib/types";

export function ResultActions({ trackId }: { trackId: TrackId }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const retry = () => {
    clearAnswers(trackId);
    router.push(`/survey/${trackId}`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 미지원 브라우저는 무시
    }
  };

  return (
    <section className="mt-10 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={retry}
        className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/70 transition hover:border-white/40 hover:text-white"
      >
        ↺ 다시하기
      </button>
      <Link
        href="/#tracks"
        className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/70 transition hover:border-white/40 hover:text-white"
      >
        다른 계열 해보기
      </Link>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:scale-[1.02]"
      >
        {copied ? "복사 완료! ✓" : "친구에게 공유하기 🔗"}
      </button>
    </section>
  );
}
