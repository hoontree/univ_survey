"use client";

import { useState } from "react";
import { Button } from "@/components/ds/Button";
import { saveAccessToken } from "@/lib/storage";
import type { TrackMeta } from "@/lib/tracks";

interface TokenGateProps {
  meta: TrackMeta;
  /** 게이트 위에 띄울 사전 안내 (토큰 무효로 재입력하는 경우 등) */
  notice?: string | null;
  onPass: (code: string) => void;
}

/** 하이픈 자동 삽입 표시 (XXXX-XXXX) */
function prettify(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

/**
 * 수강생 이용 토큰 입력 게이트 — 설문 진입 전 유효성 확인(차감 없음).
 * 통과하면 sessionStorage에 저장되어 다른 계열 설문에도 재입력이 필요 없다.
 */
export function TokenGate({ meta, notice, onPass }: TokenGateProps) {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const code = value.replace(/-/g, "");
    if (code.length < 8) {
      setError("코드 8자리를 모두 입력해 주세요.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        saveAccessToken(code);
        onPass(code);
      } else {
        setError(
          data.reason === "exhausted"
            ? "이 토큰은 사용 횟수(2회)를 모두 사용했어요. 선생님께 새 토큰을 요청해 주세요."
            : "등록되지 않은 토큰이에요. 코드를 다시 확인해 주세요.",
        );
      }
    } catch {
      setError("확인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      className="univ-question-enter"
      style={{ marginTop: 48, textAlign: "center" }}
    >
      <span style={{ fontSize: 40 }} aria-hidden>
        🎟️
      </span>
      <h1
        style={{
          margin: "20px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-h3)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-strong)",
        }}
      >
        이용 토큰을 입력해 주세요
      </h1>
      <p
        style={{
          margin: "12px auto 0",
          maxWidth: 380,
          fontSize: "var(--text-sm)",
          lineHeight: "var(--leading-relaxed)",
          color: "var(--text-muted)",
        }}
      >
        {meta.name} 설문은 우주설 수업 수강생에게 발급된 토큰으로 이용할 수
        있어요. 토큰 1개로 <strong style={{ color: "var(--text-primary)" }}>2회</strong>까지
        추천을 받을 수 있습니다.
      </p>

      {notice && (
        <p
          style={{
            margin: "16px auto 0",
            maxWidth: 380,
            fontSize: "var(--text-xs)",
            color: "#fecdd3",
          }}
        >
          {notice}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{
          margin: "28px auto 0",
          maxWidth: 320,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <input
          value={value}
          onChange={(e) => {
            setValue(prettify(e.target.value));
            setError(null);
          }}
          placeholder="XXXX-XXXX"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          aria-label="이용 토큰 코드"
          style={{
            width: "100%",
            background: "var(--space-800)",
            color: "var(--text-strong)",
            border: `1px solid ${error ? "var(--danger-border)" : "var(--border-strong)"}`,
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            fontFamily: "var(--font-display)",
            fontSize: "1.25rem",
            letterSpacing: "0.15em",
            textAlign: "center",
          }}
        />
        {error && (
          <p
            role="alert"
            style={{
              margin: 0,
              fontSize: "var(--text-xs)",
              lineHeight: "var(--leading-relaxed)",
              color: "var(--danger)",
            }}
          >
            {error}
          </p>
        )}
        <Button type="submit" track={meta.id} disabled={checking} fullWidth>
          {checking ? "확인 중..." : "설문 시작하기 🚀"}
        </Button>
      </form>

      <p
        style={{
          margin: "24px 0 0",
          fontSize: "var(--text-xs)",
          color: "var(--text-ghost)",
        }}
      >
        토큰이 없다면 우주설 수업에서 안내받을 수 있어요.
      </p>
    </div>
  );
}
