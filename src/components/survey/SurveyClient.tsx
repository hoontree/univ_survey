"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

  // 저장된 답변(새로고침 복원) + 이번 세션에서 고른 답변
  const persisted = useMemo(
    () => (hydrated ? (loadAnswers(track.id) ?? {}) : {}),
    [hydrated, track.id],
  );
  const [overrides, setOverrides] = useState<Answers>({});
  const answers = useMemo(() => ({ ...persisted, ...overrides }), [persisted, overrides]);

  // null이면 "첫 미응답 문항"을 자동 표시 (복원 시 이어하기)
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
    setNavIndex(index); // 파생 인덱스가 즉시 넘어가지 않도록 현재 위치 고정
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-bold text-white/50 transition hover:text-white"
        >
          ← 유니버설
        </Link>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-white/70">
          {meta.emoji} {meta.name}
        </span>
      </header>

      <div className="mt-8">
        <div className="flex items-end justify-between text-xs font-bold text-white/50">
          <span>
            문항 <span className="text-base text-indigo-300">{index + 1}</span> /{" "}
            {questions.length}
          </span>
          <span>{Math.round(((index + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${meta.accent} transition-all duration-300`}
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div
        key={question.id}
        className={direction === "fwd" ? "question-enter mt-10" : "question-enter-back mt-10"}
      >
        <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">
          {question.text}
        </h1>
        <ul className="mt-7 space-y-3">
          {question.options.map((option) => {
            const isSelected = selected === option.value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => select(option.value)}
                  className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition active:scale-[0.99] ${
                    isSelected
                      ? "border-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-500/20"
                      : "border-white/10 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08]"
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      isSelected
                        ? "bg-indigo-400 text-slate-950"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {option.value}
                  </span>
                  <span className="text-sm font-medium sm:text-base">{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8 flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={goBack}
          disabled={index === 0 || finishing}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/70 transition enabled:hover:border-white/40 enabled:hover:text-white disabled:opacity-30"
        >
          ← 이전
        </button>
        {selected !== undefined ? (
          <button
            type="button"
            onClick={() => goNext(answers)}
            disabled={finishing}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:scale-[1.02] disabled:opacity-60"
          >
            {finishing ? "결과 계산 중..." : isLast ? "결과 보기 🚀" : "다음 →"}
          </button>
        ) : (
          <p className="text-xs text-white/40">답변을 고르면 자동으로 넘어가요</p>
        )}
      </div>
    </main>
  );
}
