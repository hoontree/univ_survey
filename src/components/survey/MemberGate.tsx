"use client";

import { useState } from "react";
import { Button } from "@/components/ds/Button";
import { inputStyle } from "@/components/ds/inputStyle";
import { saveMemberToken } from "@/lib/storage";
import type { TrackMeta } from "@/lib/tracks";

interface MemberGateProps {
  meta: TrackMeta;
  /** 게이트 위에 띄울 사전 안내 (인증이 풀려 다시 확인하는 경우 등) */
  notice?: string | null;
  onPass: (token: string) => void;
}

/**
 * 인클래스 본인 확인 게이트 — 설문 진입 전 명단 대조(차감 없음).
 * 통과하면 발급된 토큰이 sessionStorage에 저장되어 다른 계열 설문에도
 * 다시 확인할 필요가 없다.
 */
export function MemberGate({ meta, notice, onPass }: MemberGateProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !phone.trim()) {
      setError("아이디와 휴대폰번호를 모두 입력해 주세요.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/members/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json();
      if (data.ok) {
        saveMemberToken(data.token);
        onPass(data.token);
      } else {
        setError(data.error ?? "본인 확인에 실패했어요. 다시 시도해 주세요.");
      }
    } catch {
      setError("확인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="univ-question-enter" style={{ marginTop: 48, textAlign: "center" }}>
      <span style={{ fontSize: 40 }} aria-hidden>
        🪪
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
        본인 확인이 필요해요
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
        {meta.name} 설문은 인클래스에 등록된 우주설 수업 수강생이 이용할 수 있어요.
        인클래스 아이디와 가입할 때 쓴 휴대폰번호를 입력해 주세요.{" "}
        <strong style={{ color: "var(--text-primary)" }}>2회</strong>까지 추천을 받을 수 있습니다.
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
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="인클래스 아이디"
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          aria-label="인클래스 아이디(이메일)"
          style={{ ...inputStyle, width: "100%", padding: "14px 16px", textAlign: "center" }}
        />
        <input
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/[^0-9-]/g, ""));
            setError(null);
          }}
          placeholder="휴대폰번호"
          autoComplete="tel"
          inputMode="numeric"
          aria-label="휴대폰번호"
          style={{ ...inputStyle, width: "100%", padding: "14px 16px", textAlign: "center" }}
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
          margin: "24px auto 0",
          maxWidth: 380,
          fontSize: "var(--text-xs)",
          lineHeight: "var(--leading-relaxed)",
          color: "var(--text-ghost)",
        }}
      >
        아이디는 <b>@inclass.co.kr</b> 앞부분만 입력해도 돼요. 본인 번호가 등록돼 있지 않다면
        학부모님 번호로도 확인할 수 있어요. 입력한 번호는 본인 확인에만 쓰고 그대로 저장하지
        않습니다.
      </p>
    </div>
  );
}
