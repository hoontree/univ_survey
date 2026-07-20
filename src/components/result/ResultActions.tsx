"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ds/Button";
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
    <section
      style={{
        marginTop: 40,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <Button variant="secondary" leadingIcon="↺" onClick={retry}>
        다시하기
      </Button>
      <Button variant="secondary" href="/#tracks">
        다른 계열 해보기
      </Button>
      <Button track={trackId} trailingIcon="🔗" onClick={copyLink}>
        {copied ? "복사 완료! ✓" : "친구에게 공유하기"}
      </Button>
    </section>
  );
}
