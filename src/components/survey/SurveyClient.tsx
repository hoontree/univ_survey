"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ds/Button";
import { OptionButton } from "@/components/ds/OptionButton";
import { QuestionProgress } from "@/components/ds/QuestionProgress";
import { loadAnswers, saveAnswers } from "@/lib/storage";
import type { TrackMeta } from "@/lib/tracks";
import { useHydrated } from "@/lib/useHydrated";
import type { Answers, TrackData } from "@/lib/types";

const ADVANCE_DELAY_MS = 220;

function firstUnansweredIndex(track: TrackData, answers: Answers): number {
  const index = track.questions.findIndex((q) => answers[q.id] === undefined);
  return index === -1 ? track.questions.length - 1 : index;
}

export function SurveyClient({ track, meta }: { track: TrackData; meta: TrackMeta }) {
  const router = useRouter();
  const hydrated = useHydrated();

  const persisted = useMemo(
    () => (hydrated ? (loadAnswers(track.id) ?? {}) : {}),
    [hydrated, track.id],
  );
  const [overrides, setOverrides] = useState<Answers>({});
  const answers = useMemo(() => ({ ...persisted, ...overrides }), [persisted, overrides]);

  const [navIndex, setNavIndex] = useState<number | null>(null);
  const index = navIndex ?? firstUnansweredIndex(track, answers);

  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [finishing, setFinishing] = useState(false);
  const advanceTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  const questions = track.questions;
  const question = questions[index];
  const selected = answers[question.id];
  const isLast = index === questions.length - 1;

  const finish = (finalAnswers: Answers) => {
    setFinishing(true);
    // 익명 통계 저장 — 실패해도 결과 표시는 그대로 진행
    fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track: track.id, answers: finalAnswers }),
      keepalive: true,
    }).catch(() => {});
    router.push(`/survey/${track.id}/result`);
  };

  const goNext = (nextAnswers: Answers) => {
    if (isLast) {
      finish(nextAnswers);
    } else {
      setDirection("fwd");
      setNavIndex(index + 1);
    }
  };

  const select = (value: number) => {
    if (finishing) return;
    const next = { ...answers, [question.id]: value };
    setOverrides((prev) => ({ ...prev, [question.id]: value }));
    setNavIndex(index);
    saveAnswers(track.id, next);
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => goNext(next), ADVANCE_DELAY_MS);
  };

  const goBack = () => {
    if (index === 0 || finishing) return;
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    setDirection("back");
    setNavIndex(index - 1);
  };

  return (
    <main
      style={{
        margin: "0 auto",
        display: "flex",
        width: "100%",
        maxWidth: "var(--container-survey)",
        flex: 1,
        flexDirection: "column",
        padding: "32px 24px",
      }}
    >
      <PageHeader meta={meta} />

      <div style={{ marginTop: 32 }}>
        <QuestionProgress index={index + 1} total={questions.length} track={track.id} />
      </div>

      <div
        key={question.id}
        className={direction === "fwd" ? "univ-question-enter" : "univ-question-enter-back"}
        style={{ marginTop: 40 }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-h3)",
            fontWeight: "var(--fw-bold)",
            lineHeight: "var(--leading-snug)",
            color: "var(--text-strong)",
          }}
        >
          {question.text}
        </h1>
        <ul
          style={{
            listStyle: "none",
            margin: "28px 0 0",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {question.options.map((option) => (
            <li key={option.value}>
              <OptionButton
                value={option.value}
                label={option.label}
                selected={selected === option.value}
                onClick={() => select(option.value)}
              />
            </li>
          ))}
        </ul>
      </div>

      <div
        style={{
          marginTop: 32,
          paddingBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Button variant="secondary" onClick={goBack} disabled={index === 0 || finishing}>
          ← 이전
        </Button>
        {selected !== undefined ? (
          <Button
            track={track.id}
            onClick={() => goNext(answers)}
            disabled={finishing}
            trailingIcon={finishing ? undefined : isLast ? "🚀" : "→"}
          >
            {finishing ? "결과 계산 중..." : isLast ? "결과 보기" : "다음"}
          </Button>
        ) : (
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            답변을 고르면 자동으로 넘어가요
          </p>
        )}
      </div>
    </main>
  );
}
