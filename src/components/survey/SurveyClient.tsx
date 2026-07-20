"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ds/Button";
import { OptionButton } from "@/components/ds/OptionButton";
import { QuestionProgress } from "@/components/ds/QuestionProgress";
import { TokenGate } from "@/components/survey/TokenGate";
import {
  clearAccessToken,
  loadAccessToken,
  loadAnswers,
  saveAnswers,
  saveGrant,
} from "@/lib/storage";
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

  /* ── 이용 토큰 게이트 ── */
  const persistedToken = useMemo(
    () => (hydrated ? loadAccessToken() : null),
    [hydrated],
  );
  const [passedCode, setPassedCode] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [gateNotice, setGateNotice] = useState<string | null>(null);
  const token = passedCode ?? (revoked ? null : persistedToken);

  /* ── 답변 상태 ── */
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
  const [finishError, setFinishError] = useState<string | null>(null);
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

  const revokeToken = (notice: string) => {
    clearAccessToken();
    setPassedCode(null);
    setRevoked(true);
    setGateNotice(notice);
  };

  const finish = async (finalAnswers: Answers) => {
    if (!token || finishing) return;
    setFinishing(true);
    setFinishError(null);
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: track.id, answers: finalAnswers, token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        saveGrant(track.id);
        router.push(`/survey/${track.id}/result`);
        return;
      }
      if (data.reason === "exhausted") {
        revokeToken("토큰 사용 횟수(2회)를 모두 사용했어요. 새 토큰이 있다면 입력해 주세요.");
      } else if (data.reason === "invalid" || data.reason === "missing") {
        revokeToken("입력했던 토큰이 더 이상 유효하지 않아요. 다시 확인해 주세요.");
      } else {
        setFinishError(data.error ?? "결과 발급에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setFinishError("네트워크 문제로 결과 발급에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setFinishing(false);
    }
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
    // 마지막 문항은 자동 제출하지 않음 — 결과 발급(토큰 차감)은 버튼으로 명시적으로
    if (!isLast) {
      advanceTimer.current = window.setTimeout(() => goNext(next), ADVANCE_DELAY_MS);
    }
  };

  const goBack = () => {
    if (index === 0 || finishing) return;
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    setDirection("back");
    setNavIndex(index - 1);
  };

  /* 토큰 없음 → 게이트 표시 */
  if (hydrated && !token) {
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
        <TokenGate
          meta={meta}
          notice={gateNotice}
          onPass={(code) => {
            setPassedCode(code);
            setGateNotice(null);
          }}
        />
      </main>
    );
  }

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

      {finishError && (
        <p
          role="alert"
          style={{
            margin: "20px 0 0",
            fontSize: "var(--text-xs)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--danger)",
            textAlign: "center",
          }}
        >
          {finishError}
        </p>
      )}

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
