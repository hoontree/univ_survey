"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { SectionHeading } from "@/components/ds/SectionHeading";
import { getTrack } from "@/lib/tracks";

/* 실제 비메디컬 문항 2개를 발췌해 데모로 사용 (저장·API 호출 없음) */
const demoTrack = getTrack("nonmedical");
const DEMO_SCENES = [
  { type: "question" as const, question: demoTrack.questions[0], pick: 2 },
  { type: "question" as const, question: demoTrack.questions[5], pick: 2 },
  { type: "result" as const },
];

/** 예시 결과 — 화면 연출용 샘플 수치 */
const DEMO_RESULT = [
  { university: "중앙대", votes: 10, winner: true },
  { university: "서강대", votes: 9, winner: false },
  { university: "경희대", votes: 9, winner: false },
];

const PICK_AT_MS = 1000;
const QUESTION_MS = 2000;
const RESULT_MS = 3600;

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * 랜딩 홍보용 자동 재생 미리보기 — 문항 선택 → 전환 → 결과 카드가
 * 폰 프레임 안에서 루프한다. 모션 최소화 설정 시 결과 화면으로 고정.
 */
export function DemoShowcase() {
  const reduced = usePrefersReducedMotion();
  const [scene, setScene] = useState(0);
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const current = DEMO_SCENES[scene];
    const timers: number[] = [];
    if (current.type === "question") {
      timers.push(window.setTimeout(() => setPicked(true), PICK_AT_MS));
      timers.push(
        window.setTimeout(() => {
          setPicked(false);
          setScene((s) => (s + 1) % DEMO_SCENES.length);
        }, QUESTION_MS),
      );
    } else {
      timers.push(
        window.setTimeout(() => {
          setPicked(false);
          setScene(0);
        }, RESULT_MS),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [scene, reduced]);

  // 모션 최소화: 결과 화면 정지 표시
  const active = reduced ? DEMO_SCENES[DEMO_SCENES.length - 1] : DEMO_SCENES[scene];

  return (
    <section
      style={{
        padding: "56px 24px 8px",
        maxWidth: "var(--container-page)",
        margin: "0 auto",
      }}
    >
      <SectionHeading
        title="이런 식으로 찾아드려요"
        subtitle="실제 설문 화면 미리보기 — 예시 화면입니다."
      />
      <div style={{ marginTop: 36, display: "flex", justifyContent: "center" }}>
        {/* 폰 프레임 */}
        <div
          aria-hidden
          style={{
            width: 300,
            height: 480,
            borderRadius: 36,
            border: "1px solid var(--border-strong)",
            background: "var(--space-850)",
            boxShadow: "var(--shadow-lg), var(--glow-accent-soft)",
            padding: "20px 18px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* 노치 */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 72,
              height: 5,
              borderRadius: "var(--radius-full)",
              background: "var(--w-15)",
            }}
          />
          <div key={reduced ? "static" : scene} className="univ-question-enter" style={{ marginTop: 20 }}>
            {active.type === "question" ? (
              <DemoQuestion
                index={scene + 1}
                text={active.question.text}
                options={active.question.options.map((o) => o.label)}
                picked={picked ? active.pick : null}
              />
            ) : (
              <DemoResult />
            )}
          </div>
        </div>
      </div>
      <p
        style={{
          margin: "16px 0 0",
          textAlign: "center",
          fontSize: "var(--text-xs)",
          color: "var(--text-ghost)",
        }}
      >
        미리보기 예시입니다 · 실제 추천은 이용 토큰으로 설문을 완료하면 받을 수 있어요
      </p>
    </section>
  );
}

function DemoQuestion({
  index,
  text,
  options,
  picked,
}: {
  index: number;
  text: string;
  options: string[];
  picked: number | null;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          fontWeight: "var(--fw-bold)",
          color: "var(--text-muted)",
        }}
      >
        <span>
          문항 <span style={{ color: "var(--text-accent)" }}>{index}</span> / 10
        </span>
        <span>{index * 10}%</span>
      </div>
      <div
        style={{
          marginTop: 6,
          height: 4,
          borderRadius: "var(--radius-full)",
          background: "var(--w-10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${index * 10}%`,
            borderRadius: "var(--radius-full)",
            backgroundImage: "var(--gradient-nonmedical)",
            transition: "width var(--dur-base) var(--ease-out)",
          }}
        />
      </div>
      <p
        style={{
          margin: "18px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 15,
          fontWeight: "var(--fw-bold)",
          lineHeight: "var(--leading-snug)",
          color: "var(--text-strong)",
        }}
      >
        {text}
      </p>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
        {options.slice(0, 5).map((label, i) => {
          const isPicked = picked === i + 1;
          return (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                borderRadius: 12,
                border: `1px solid ${isPicked ? "var(--indigo-400)" : "var(--border-subtle)"}`,
                background: isPicked ? "var(--surface-selected)" : "var(--surface-card)",
                boxShadow: isPicked ? "var(--glow-selected)" : "none",
                padding: "8px 10px",
                transition:
                  "border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  width: 20,
                  height: 20,
                  flex: "0 0 auto",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-full)",
                  fontFamily: "var(--font-display)",
                  fontSize: 10,
                  background: isPicked ? "var(--indigo-400)" : "var(--w-10)",
                  color: isPicked ? "var(--text-on-accent)" : "var(--text-muted)",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoResult() {
  return (
    <div style={{ textAlign: "center" }}>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 9,
          fontWeight: "var(--fw-bold)",
          letterSpacing: "var(--tracking-eyebrow)",
          color: "var(--text-accent)",
        }}
      >
        🪐 우주설의 최종 추천
      </p>
      <p
        className="univ-gradient-text"
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 34,
          lineHeight: 1.1,
        }}
      >
        중앙대
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 11,
          fontWeight: "var(--fw-bold)",
          color: "var(--text-muted)",
        }}
      >
        10개 문항 중 <span style={{ color: "var(--text-strong)" }}>10개 기준 충족</span>
      </p>
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
        {DEMO_RESULT.map((row, i) => (
          <div
            key={row.university}
            style={{
              borderRadius: 12,
              border: `1px solid ${row.winner ? "var(--border-accent)" : "var(--border-subtle)"}`,
              background: row.winner ? "var(--surface-accent-soft)" : "var(--surface-card)",
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontWeight: "var(--fw-bold)",
                color: "var(--text-primary)",
              }}
            >
              <span>
                {i + 1} · {row.university} {row.winner && "👑"}
              </span>
              <span style={{ color: "var(--text-muted)" }}>{row.votes}표 / 10</span>
            </div>
            <div
              style={{
                marginTop: 5,
                height: 4,
                borderRadius: "var(--radius-full)",
                background: "var(--w-10)",
                overflow: "hidden",
              }}
            >
              <div
                className="univ-bar-fill"
                style={{
                  height: "100%",
                  width: `${row.votes * 10}%`,
                  borderRadius: "var(--radius-full)",
                  backgroundImage: "var(--gradient-nonmedical)",
                  opacity: row.winner ? 1 : 0.4,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "16px 0 0", fontSize: 9, color: "var(--text-ghost)" }}>
        예시 화면 · 실제 결과는 답변에 따라 달라져요
      </p>
    </div>
  );
}
